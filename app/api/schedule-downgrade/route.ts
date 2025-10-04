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
    // 1️⃣ Auth
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // 2️⃣ Parse body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId)
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // 3️⃣ Get membership
    const { data: membership, error } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id, stripe_subscription_id, plan")
      .eq("user_id", userId)
      .single();

    if (error || !membership?.stripe_subscription_id)
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );

    // 4️⃣ Retrieve subscription
    const sub = await stripe.subscriptions.retrieve(
      membership.stripe_subscription_id
    );
    const currentPeriodEnd = (sub as any).current_period_end;

    if (!currentPeriodEnd)
      return NextResponse.json(
        { error: "Subscription missing period info" },
        { status: 400 }
      );

    // 5️⃣ Schedule downgrade (Stripe can’t auto-schedule)
    // We simply mark it cancel_at_period_end=true
    // and store next plan in Supabase.
    await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      metadata: {
        scheduled_downgrade_to: targetPlan,
        billing,
        userId,
      },
    });

    // 6️⃣ Update membership
    await supabaseAdmin
      .from("membership")
      .upsert(
        {
          user_id: userId,
          scheduled_plan: targetPlan,
          scheduled_plan_effective_at: new Date(
            currentPeriodEnd * 1000
          ).toISOString(),
          ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

    // ✅ Done
    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled at period end.`,
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
