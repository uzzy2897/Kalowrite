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
    // 1) Auth
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // 2) Parse body
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // 3) Get current membership row (we expect one to exist if the user subscribed)
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id, stripe_subscription_id, plan")
      .eq("user_id", userId)
      .single();

    if (memErr || !membership?.stripe_subscription_id) {
      console.error("❌ No active subscription found:", memErr);
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    // 4) Retrieve subscription (expand a bit to be safe)
    const sub = await stripe.subscriptions.retrieve(membership.stripe_subscription_id, {
      expand: ["items.data.price", "latest_invoice"],
    });

    // 5) Defensive period extraction (Stripe sometimes omits fields)
    const s = sub as any;
    const currentPeriodEndUnix =
      s.current_period_end ??
      s.trial_end ??
      (s.billing_cycle_anchor ? s.billing_cycle_anchor + 30 * 86400 : Math.floor(Date.now() / 1000 + 30 * 86400));

    const currentPeriodStartUnix =
      s.current_period_start ??
      s.trial_start ??
      Math.floor(Date.now() / 1000);

    const effectiveAtISO = new Date(currentPeriodEndUnix * 1000).toISOString();
    const startedAtISO = new Date(currentPeriodStartUnix * 1000).toISOString();

    console.log("🕓 Subscription period", {
      start_unix: currentPeriodStartUnix,
      end_unix: currentPeriodEndUnix,
      start_iso: startedAtISO,
      end_iso: effectiveAtISO,
      had_period_fields: Boolean(s.current_period_start && s.current_period_end),
    });

    // 6) Mark subscription to end at period end (we'll re-create a cheaper one in the webhook)
    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      metadata: {
        userId,
        action: "scheduled_downgrade",
        scheduled_downgrade_to: targetPlan,
        scheduled_billing: billing,
        scheduled_effective_at: effectiveAtISO,
      },
    });

    console.log("🧾 Stripe sub marked cancel_at_period_end:", {
      id: updated.id,
      cancel_at_period_end: updated.cancel_at_period_end,
    });

    // 7) Write to Supabase — update first; if no row changed, insert (belt & suspenders)
    const updatePayload = {
      scheduled_plan: targetPlan,
      scheduled_plan_effective_at: effectiveAtISO,
      started_at: startedAtISO,
      ends_at: effectiveAtISO,
      updated_at: new Date().toISOString(),
    };

    const { data: updData, error: updErr } = await supabaseAdmin
      .from("membership")
      .update(updatePayload)
      .eq("user_id", userId)
      .select();

    if (updErr) {
      console.error("❌ membership.update failed, will try insert:", updErr);
    }

    if (!updErr && Array.isArray(updData) && updData.length > 0) {
      console.log("✅ membership.update ok:", updData);
    } else {
      const { data: insData, error: insErr } = await supabaseAdmin
        .from("membership")
        .insert([{ user_id: userId, ...updatePayload }])
        .select();

      if (insErr) {
        console.error("❌ membership.insert failed:", insErr);
        return NextResponse.json({ error: "Failed to persist scheduled downgrade" }, { status: 500 });
      }
      console.log("✅ membership.insert ok:", insData);
    }

    // 8) Done
    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled at the end of this billing period.`,
      effective_at: effectiveAtISO,
    });
  } catch (err: any) {
    console.error("❌ Downgrade error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}
