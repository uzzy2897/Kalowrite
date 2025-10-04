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
    // 1️⃣ Clerk Auth
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // 2️⃣ Parse request body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId)
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // 3️⃣ Fetch membership to get subscription
    const { data: membership, error } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id, stripe_subscription_id, plan")
      .eq("user_id", userId)
      .single();

    if (error || !membership?.stripe_subscription_id) {
      console.error("❌ No active subscription found:", error);
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // 4️⃣ Retrieve full subscription from Stripe
    const sub = await stripe.subscriptions.retrieve(
      membership.stripe_subscription_id,
      { expand: ["items.data.price"] }
    );

    // 🧠 Defensive access (Stripe sometimes omits these fields)
    const s = sub as any;
    const currentPeriodEnd =
      s.current_period_end ??
      s.trial_end ??
      (s.billing_cycle_anchor
        ? s.billing_cycle_anchor + 30 * 86400
        : Math.floor(Date.now() / 1000 + 30 * 86400));
    const currentPeriodStart =
      s.current_period_start ??
      s.trial_start ??
      Math.floor(Date.now() / 1000);

    // 🕓 Log period info for debugging
    console.log("🕓 Subscription period:", {
      start: currentPeriodStart,
      end: currentPeriodEnd,
      hasPeriod: !!s.current_period_end,
    });

    // 5️⃣ Instead of scheduling via SubscriptionSchedule (not allowed),
    // we mark cancel_at_period_end=true and store next plan in Supabase
    await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      metadata: {
        scheduled_downgrade_to: targetPlan,
        billing,
        userId,
      },
    });

    const { data: updateData, error: updateError } = await supabaseAdmin
    .from("membership")
    .update({
      scheduled_plan: targetPlan,
      scheduled_plan_effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      started_at: new Date(currentPeriodStart * 1000).toISOString(),
      ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .select();
  
  if (updateError) {
    console.error("❌ Membership update failed:", updateError);
  } else {
    console.log("✅ Membership updated successfully:", updateData);
  }
  
    // ✅ Done
    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled at the end of this billing period.`,
      effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error("❌ Downgrade error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
