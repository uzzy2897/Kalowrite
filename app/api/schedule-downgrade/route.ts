import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  free: process.env.STRIPE_PRICE_FREE,
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
  ultra: process.env.STRIPE_PRICE_ULTRA,
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetPlan } = await req.json();
    if (!targetPlan || !PRICE_BY_PLAN[targetPlan])
      return NextResponse.json(
        { error: "Invalid or missing targetPlan" },
        { status: 400 }
      );

    // 1️⃣  Get current membership
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

    const stripeCustomerId = membership.stripe_customer_id;

    // 2️⃣  Retrieve active subscription
    const subs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
      expand: ["data.items.price"],
    });

    const sub = subs.data[0];
    if (!sub)
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );

    const currentPriceId = sub.items.data[0]?.price.id;
    const targetPriceId = PRICE_BY_PLAN[targetPlan]!;
    if (currentPriceId === targetPriceId)
      return NextResponse.json({ message: "Already on this plan." });

    // 3️⃣  Extract current period end safely
    const currentPeriodEnd: number | undefined = (sub as any)?.current_period_end;
    if (!currentPeriodEnd)
      return NextResponse.json(
        { error: "Missing current period end" },
        { status: 400 }
      );

    // 4️⃣  Create subscription schedule (✅ Basil-compatible)
    const scheduleParams: Stripe.SubscriptionScheduleCreateParams = {
      from_subscription: sub.id,
      start_date: currentPeriodEnd, // apply at next billing date
      phases: [
        {
          items: [{ price: targetPriceId, quantity: 1 }],
          iterations: 0, // continue indefinitely
        },
      ],
    };

    const schedule = await stripe.subscriptionSchedules.create(scheduleParams);

    // 5️⃣  Update Supabase membership
    await supabaseAdmin
      .from("membership")
      .update({
        scheduled_plan: targetPlan,
        scheduled_plan_effective_at: new Date(
          currentPeriodEnd * 1000
        ).toISOString(),
        started_at: new Date((sub as any).current_period_start * 1000).toISOString(),
        ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      message: `Plan change to '${targetPlan}' scheduled for end of billing period.`,
      scheduled_plan: targetPlan,
      effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      schedule_id: schedule.id,
    });
  } catch (err: any) {
    console.error("Downgrade error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
