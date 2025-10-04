// app/api/schedule-downgrade/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    // 1️⃣ Clerk auth
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // 2️⃣ Parse body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId)
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // 3️⃣ Fetch customer id
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id, plan")
      .eq("user_id", userId)
      .single();

    if (memErr || !membership?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active membership found" },
        { status: 404 }
      );
    }

    // 4️⃣ Retrieve the active subscription
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

    // ✅ Expand fully so Stripe returns period data
    const sub = (await stripe.subscriptions.retrieve(subSummary.id, {
      expand: ["items.data.price", "latest_invoice", "schedule"],
    })) as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
      trial_start?: number;
      trial_end?: number;
    };

    // 5️⃣ Safely extract billing info
    const currentPriceId =
      sub.items?.data?.find((i) => i.price?.active)?.price?.id ?? null;

    const currentPeriodStart =
      sub.current_period_start ??
      sub.trial_start ??
      Math.floor(Date.now() / 1000);
    const currentPeriodEnd =
      sub.current_period_end ??
      sub.trial_end ??
      Math.floor(Date.now() / 1000 + 30 * 86400);

    if (!currentPeriodEnd)
      return NextResponse.json(
        { error: "Subscription missing period info" },
        { status: 400 }
      );

    if (currentPriceId === targetPriceId)
      return NextResponse.json({ message: "Already on this plan." });

    // 6️⃣ Schedule downgrade at the end of current period
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: sub.id,
      start_date: currentPeriodEnd,
      phases: [
        {
          items: [{ price: targetPriceId, quantity: 1 }],
          metadata: { userId, targetPlan, billing },
        },
      ],
      metadata: { userId, targetPlan, billing },
    });

    // 7️⃣ Update Supabase record
    await supabaseAdmin
      .from("membership")
      .upsert(
        {
          user_id: userId,
          scheduled_plan: targetPlan,
          scheduled_plan_effective_at: new Date(
            currentPeriodEnd * 1000
          ).toISOString(),
          started_at: new Date(currentPeriodStart * 1000).toISOString(),
          ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

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
