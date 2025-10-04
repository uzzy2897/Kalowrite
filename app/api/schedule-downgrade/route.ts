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
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 🧩 2️⃣ Parse input
    const { targetPlan, billing = "monthly" } = await req.json();
    const targetPriceId = getPriceId(targetPlan, billing);
    if (!targetPriceId)
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // 🧩 3️⃣ Find active membership in Supabase
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

    // 🧩 4️⃣ Get the active subscription
    const subs = await stripe.subscriptions.list({
      customer: membership.stripe_customer_id,
      status: "active",
      limit: 1,
      expand: ["data.items.data.price"], // ✅ Basil-compatible
    });

    const subList = subs.data[0];
    if (!subList)
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
// 🧠 Retrieve full subscription to ensure period info (fix for Basil typings)
const subResponse = await stripe.subscriptions.retrieve(subList.id);
const sub = (subResponse as any).data ?? subResponse; // ✅ unwrap safely

const currentPriceId = sub.items?.data?.[0]?.price?.id;
const currentPeriodEnd = sub.current_period_end;
const currentPeriodStart = sub.current_period_start;

    if (!currentPeriodEnd)
      return NextResponse.json(
        { error: "Subscription missing period info" },
        { status: 400 }
      );

    // 🧩 5️⃣ Create a schedule that applies at the next billing date
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

    // 🧩 7️⃣ Respond success
    return NextResponse.json({
      success: true,
      message: `Downgrade to '${targetPlan}' scheduled at end of billing period.`,
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
