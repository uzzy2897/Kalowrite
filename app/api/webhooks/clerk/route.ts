import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    // -------------------------
    // TEMP: Skip signature verification for testing
    // -------------------------
    const evt = await req.json(); // just parse the body
    const { type, data } = evt;
    const attrs = data?.attributes;

    console.log("📩 Received webhook event:", type);
    console.log("📦 Payload:", JSON.stringify(data, null, 2));

    switch (type) {
      // -------------------------
      // Subscription Events
      // -------------------------
      case "subscription.created": {
        await supabase.from("subscriptions").insert({
          id: data.id,
          user_id: attrs.user,
          status: attrs.status,
          plan: attrs.price_id,
          created_at: new Date(attrs.created_at * 1000).toISOString(),
        });
        break;
      }

      case "subscription.updated": {
        await supabase
          .from("subscriptions")
          .update({
            status: attrs.status,
            plan: attrs.price_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      case "subscription.active": {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      case "subscription.past_due": {
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            plan: attrs.price_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      // -------------------------
      // Subscription Item Events
      // -------------------------
      case "subscriptionItem.created": {
        await supabase.from("subscription_items").insert({
          id: data.id,
          subscription_id: attrs.subscription_id,
          user_id: attrs.user,
          plan: attrs.price_id,
          status: attrs.status,
          created_at: new Date(attrs.created_at * 1000).toISOString(),
        });
        break;
      }

      case "subscriptionItem.updated": {
        await supabase
          .from("subscription_items")
          .update({
            status: attrs.status,
            plan: attrs.price_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      case "subscriptionItem.active": {
        await supabase
          .from("subscription_items")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      case "subscriptionItem.canceled":
      case "subscriptionItem.ended":
      case "subscriptionItem.abandoned": {
        await supabase
          .from("subscription_items")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      case "subscriptionItem.past_due": {
        await supabase
          .from("subscription_items")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        break;
      }

      // -------------------------
      // Payment Attempt Events
      // -------------------------
      case "paymentAttempt.created":
      case "paymentAttempt.updated": {
        await supabase.from("payment_attempts").insert({
          id: data.id,
          user_id: attrs.user,
          subscription_id: attrs.subscription_id,
          status: attrs.status,
          amount: attrs.amount,
          currency: attrs.currency,
          created_at: new Date(attrs.created_at * 1000).toISOString(),
        });
        break;
      }

      default:
        console.log("ℹ️ Ignored event type:", type);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
