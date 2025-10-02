import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  const h = await headers(); // ✅ must await
  const sig = h.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err);
    return new Response(`Webhook error: ${err}`, { status: 400 });
  }

  console.log("🔔 Stripe event received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    console.log("📦 Session object:", session);
    console.log("👤 User ID from metadata:", userId);

    if (!userId) {
      console.error("❌ No userId found in session metadata");
      return new Response("Missing userId in metadata", { status: 400 });
    }

    // 🔹 Fetch line items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
    });
    const priceId = lineItems.data[0]?.price?.id;
    console.log("🧾 Line Items:", lineItems.data);

    // -------------------------------
    // Subscription handling
    // -------------------------------
    if (session.mode === "subscription" && priceId) {
      const plan =
        priceId === process.env.STRIPE_PRICE_BASIC
          ? "basic"
          : priceId === process.env.STRIPE_PRICE_PRO
          ? "pro"
          : "ultra";

      console.log(`📌 Subscription plan detected: ${plan}`);

      // 1. Update membership table
      const { error: membershipError } = await supabaseAdmin
        .from("membership")
        .upsert({
          user_id: userId,
          plan,
          stripe_subscription_id: session.subscription as string,
          active: true,
        });

      if (membershipError) {
        console.error("❌ Membership insert failed:", membershipError);
      }

      // 2. Reset balance according to plan
      const refill =
        plan === "basic" ? 500 : plan === "pro" ? 1500 : 3000;

      const { error: balanceError } = await supabaseAdmin.rpc("increment_balance", {
        uid: userId,
        amount: refill,
      });

      if (balanceError) {
        console.error("❌ Balance update failed:", balanceError);
      } else {
        console.log(`✅ Balance refilled with ${refill} words for user ${userId}`);
      }

      // 3. Sync plan in user_balance table
      const { error: ubError } = await supabaseAdmin
        .from("user_balance")
        .upsert({
          user_id: userId,
          plan,
        });

      if (ubError) {
        console.error("❌ Failed to update plan in user_balance:", ubError);
      } else {
        console.log(`✅ user_balance updated with plan=${plan} for ${userId}`);
      }
    }

    // -------------------------------
    // Top-up handling
    // -------------------------------
    if (session.mode === "payment") {
      const words = parseInt(session.metadata?.words || "0", 10);
      console.log(`📌 Top-up detected: ${words} words for user ${userId}`);

      const { error: topupError } = await supabaseAdmin.from("topups").insert({
        user_id: userId,
        stripe_payment_id: session.payment_intent as string,
        words_added: words,
      });

      if (topupError) {
        console.error("❌ Topup insert failed:", topupError);
      }

      const { error: balanceError } = await supabaseAdmin.rpc("increment_balance", {
        uid: userId,
        amount: words,
      });

      if (balanceError) {
        console.error("❌ Balance update failed:", balanceError);
      } else {
        console.log(`✅ Balance incremented by ${words} words for user ${userId}`);
      }
    }
  }

  return new Response("ok", { status: 200 });
}
