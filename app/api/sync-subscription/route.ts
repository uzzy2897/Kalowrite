import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkJwt } = body;

    // Decode and verify JWT using your custom claim
    const decoded = jwt.verify(clerkJwt, process.env.CLERK_JWT_SECRET!) as any;

    // Extract subscription info from custom claims
    const subscriptionItem = decoded.subscription.items[0]; // adjust if multiple items
    const record = {
      clerk_subscription_id: subscriptionItem.id,
      user_id: decoded.user_id, // custom claim
      status: subscriptionItem.status,
      plan_id: subscriptionItem.plan.id,
      plan_name: subscriptionItem.plan.name,
      price: subscriptionItem.plan.amount,
      currency: subscriptionItem.plan.currency,
      period_start: new Date(subscriptionItem.period_start),
      period_end: new Date(subscriptionItem.period_end),
      latest_payment_id: decoded.subscription.latest_payment_id
    };

    const { error } = await supabase
    .from("subscriptions")
    .upsert([record], { onConflict: "clerk_subscription_id" });
  
  if (error) throw error;
  
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to sync subscription:", err);
    return NextResponse.json({ error: "Failed to sync subscription" }, { status: 500 });
  }
}
