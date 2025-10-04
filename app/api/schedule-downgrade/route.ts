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
    // 🧩 1️⃣ Clerk Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🧩 2️⃣ Parse body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // 🧩 3️⃣ Fetch active membership
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

    // 🧩 4️⃣ Retrieve active Stripe subscription
    const subs = await stripe.subscriptions.list({
      customer: membership.stripe_customer_id,
      status: "active",
      limit: 1,
      expand: ["data.items.data.price"], // ✅ Correct for Basil API
    });

    const subList = subs.data[0];
    if (!subList) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // ✅ Retrieve full subscription to access current_period_end/start
    const subResponse = await stripe.subscriptions.retrieve(subList.id);
    const sub = (subResponse as any).data ?? subResponse;

    const currentPriceId = sub.items?.data?.[0]?.price?.id;
    if (currentPriceId === targetPriceId) {
      return NextResponse.json({ message: "Already on this plan." });
    }

    const currentPeriodEnd: number | undefined = sub.current_period_end;
    const currentPeriodStart: number | undefined = sub.current_period_start;

    if (!currentPeriodEnd) {
      return NextResponse.json(
        { error: "Subscription missing period info" },
        { status: 400 }
      );
    }

    // 🧩 5️⃣ Schedule downgrade at next renewal
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: sub.id,
      start_date: currentPeriodEnd,
      phases: [
        {
          items: [{ price: targetPriceId, quantity: 1 }],
        },
      ],
    } as any); // Cast for Basil typings

    // 🧩 6️⃣ Update Supabase membership record
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

    // 🧩 7️⃣ Return success response
    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled at the end of the current billing period.`,
      scheduled_plan: targetPlan,
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
