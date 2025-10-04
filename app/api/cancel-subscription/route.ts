// app/api/cancel-subscription/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST() {
  try {
    // 1️⃣ Clerk Auth
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // 2️⃣ Get membership
    const { data: membership, error } = await supabaseAdmin
      .from("membership")
      .select("stripe_subscription_id, plan")
      .eq("user_id", userId)
      .single();

    if (error || !membership?.stripe_subscription_id)
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );

    // 3️⃣ Retrieve subscription
    const sub = await stripe.subscriptions.retrieve(
      membership.stripe_subscription_id
    );
    const s = sub as any;
    const currentPeriodEnd =
      s.current_period_end ??
      s.trial_end ??
      Math.floor(Date.now() / 1000 + 30 * 86400);

    // 4️⃣ Set cancel_at_period_end (keeps access until paid period ends)
    await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      metadata: {
        userId,
        action: "scheduled_cancel",
        scheduled_downgrade_to: "free",
        scheduled_effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      },
    });

    // 5️⃣ Update Supabase
    await supabaseAdmin
      .from("membership")
      .update({
        scheduled_plan: "free",
        scheduled_plan_effective_at: new Date(
          currentPeriodEnd * 1000
        ).toISOString(),
        ends_at: new Date(currentPeriodEnd * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      message: `Subscription will be canceled at the end of this billing period.`,
      effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error("❌ Cancel error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
