// app/api/stripe-webhook/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  const h = headers() as unknown as Headers;
  const sig = h.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;

      let credits = 0;
      if (priceId === process.env.STRIPE_PRICE_100) credits = 100;
      if (priceId === process.env.STRIPE_PRICE_500) credits = 500;

      if (userId && credits > 0) {
        const { error } = await supabaseAdmin.rpc("increment_balance", {
          uid: userId,
          amount: credits,
        });

        if (error) {
          console.error("❌ Supabase RPC error:", error.message);
          return new Response("Supabase error", { status: 500 });
        }

        console.log(`✅ Balance incremented for ${userId}: +${credits}`);
      }
    } catch (err: any) {
      console.error("❌ Error handling checkout.session.completed:", err.message);
      return new Response("Internal error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
