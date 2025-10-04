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
    // 1) Clerk auth
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // 2) Body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // 3) Membership row (to get Stripe customer)
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id, plan")
      .eq("user_id", userId)
      .single();

    if (memErr || !membership?.stripe_customer_id) {
      return NextResponse.json({ error: "No active membership found" }, { status: 404 });
    }

    // 4) Active subscription
    const subs = await stripe.subscriptions.list({
      customer: membership.stripe_customer_id,
      status: "active",
      limit: 1,
    });
    const subSummary = subs.data[0];
    if (!subSummary) return NextResponse.json({ error: "No active subscription found" }, { status: 404 });

    // 5) Retrieve full sub (TS-safe access via narrow any-casts)
    const raw = await stripe.subscriptions.retrieve(subSummary.id, {
      expand: ["items.data.price"],
    });

    const items = (raw as any).items as Stripe.ApiList<Stripe.SubscriptionItem>; // narrow cast
    const currentPriceId = items?.data?.find((i) => i.price?.active)?.price?.id ?? null;

    const currentPeriodStart = ((raw as any).current_period_start ?? null) as number | null;
    const currentPeriodEnd = ((raw as any).current_period_end ?? null) as number | null;

    if (!currentPeriodEnd) {
      return NextResponse.json({ error: "Subscription missing period info" }, { status: 400 });
    }

    if (currentPriceId === targetPriceId) {
      return NextResponse.json({ message: "Already on this plan." });
    }

    // 6) Schedule the downgrade at period end
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: (raw as any).id as string,
      start_date: currentPeriodEnd,
      phases: [
        {
          items: [{ price: targetPriceId, quantity: 1 }],
          metadata: { userId, targetPlan, billing },
        },
      ],
      metadata: { userId, targetPlan, billing },
    });

    // 7) Persist scheduling info (use upsert + onConflict)
    await supabaseAdmin
      .from("membership")
      .upsert(
        {
          user_id: userId,
          scheduled_plan: targetPlan,
          scheduled_plan_effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
          started_at: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
          ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled for the end of this billing period.`,
      effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      schedule_id: schedule.id,
    });
  } catch (err: any) {
    console.error("❌ Downgrade error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}
