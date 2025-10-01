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
    const words = session.metadata?.words
      ? parseInt(session.metadata.words, 10)
      : 0;

    console.log("🟢 Checkout completed:", {
      userId,
      words,
      sessionId: session.id,
    });

    if (userId && words > 0) {
      try {
        // 1️⃣ Check if this session was already processed
        const { data: existing } = await supabaseAdmin
          .from("stripe_events")
          .select("id")
          .eq("id", session.id)
          .single();

        if (existing) {
          console.warn(`⚠️ Session ${session.id} already processed, skipping`);
          return new Response("Already processed", { status: 200 });
        }

        // 2️⃣ Insert into stripe_events (to lock this session)
        const { error: insertError } = await supabaseAdmin
          .from("stripe_events")
          .insert([
            { id: session.id, user_id: userId, words: words },
          ]);

        if (insertError) {
          console.error("❌ Error inserting stripe_events:", insertError.message);
          return new Response("Insert error", { status: 500 });
        }

        // 3️⃣ Increment balance in Supabase
        const { data, error } = await supabaseAdmin.rpc("increment_balance", {
          uid: userId,
          amount: words,
        });

        if (error) {
          console.error("❌ Supabase RPC error:", error.message);
          return new Response("Supabase error", { status: 500 });
        }

        console.log(
          `✅ Balance incremented for ${userId}: +${words}, new balance: ${data}`
        );
      } catch (err: any) {
        console.error("❌ Error updating Supabase:", err.message);
        return new Response("Internal error", { status: 500 });
      }
    } else {
      console.warn("⚠️ Missing userId or words in metadata", {
        userId,
        words,
      });
    }
  }

  return new Response("ok", { status: 200 });
}
