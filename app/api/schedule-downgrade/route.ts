import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    // 1️⃣ Clerk Auth
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2️⃣ Parse body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId)
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // 3️⃣ Fetch membership
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id, plan")
      .eq("user_id", userId)
      .single();

    if (memErr || !membership?.stripe_customer_id)
      return NextResponse.json(
        { error: "No active membership found" },
        { status: 404 }
      );

    // 4️⃣ Retrieve current subscription
    const subs = await stripe.subscriptions.list({
      customer: membership.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    const subSummary = subs.data[0];
    if (!subSummary)
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );

    // ✅ Unwrap the Basil response
    const raw = await stripe.subscriptions.retrieve(subSummary.id, {
      expand: ["items.data.price"],
    });

    // ⚙️ Fix: cast to include hidden fields
    type StripeSubWithPeriod = Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
      trial_start?: number;
      trial_end?: number;
    };

    const sub = ("data" in raw ? (raw as any).data : raw) as StripeSubWithPeriod;

    const currentPriceId = sub.items?.data?.[0]?.price?.id;

    // 5️⃣ Safely access period info
    const currentPeriodEnd =
      sub.current_period_end ??
      (sub.status === "trialing" ? sub.trial_end ?? null : null);

    const currentPeriodStart =
      sub.current_period_start ??
      (sub.status === "trialing" ? sub.trial_start ?? null : null);

    if (!currentPeriodEnd)
      return NextResponse.json(
        { error: "Subscription missing period info" },
        { status: 400 }
      );

    if (currentPriceId === targetPriceId)
      return NextResponse.json({ message: "Already on this plan." });

    // 6️⃣ Schedule downgrade
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: sub.id,
      start_date: currentPeriodEnd,
      phases: [{ items: [{ price: targetPriceId, quantity: 1 }] }],
    });

    // 7️⃣ Update Supabase
    await supabaseAdmin
      .from("membership")
      .update({
        scheduled_plan: targetPlan,
        scheduled_plan_effective_at: new Date(
          currentPeriodEnd * 1000
        ).toISOString(),
        started_at: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
        ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
      })
      .eq("user_id", userId);

    // ✅ Done
    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled for the end of this billing period.`,
      effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      schedule_id: schedule.id,
    });
  } catch (err: any) {
    console.error("❌ Downgrade error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
