// app/api/webhook/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { planFromPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Helper to reset plan & balance
async function resetPlanAndBalance(userId: string, planName: string, quota: number) {
  // 1) Reset balance
  const { error: setErr } = await supabaseAdmin.rpc("set_balance", {
    uid: userId,
    new_amount: quota,
  });
  if (setErr) console.error("❌ set_balance failed:", setErr);

  // 2) Sync plan
  const { error: upErr } = await supabaseAdmin
    .from("user_balance")
    .upsert({ user_id: userId, plan: planName });
  if (upErr) console.error("❌ user_balance plan upsert failed:", upErr);
}

export async function POST(req: Request) {
  const h = await headers();
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

  // ======================================================
  // 1) First-time checkout / subscription start
  // ======================================================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("❌ No userId in metadata");
      return new Response("Missing userId", { status: 400 });
    }

    if (session.mode === "subscription") {
      // Fetch first line item
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = items.data[0]?.price?.id;
      const plan = planFromPriceId(priceId);

      if (!plan) {
        console.error("❌ Unknown price id:", priceId);
        return new Response("Unknown plan", { status: 400 });
      }

      // Update membership
      const { error: mErr } = await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        stripe_subscription_id: session.subscription as string,
        active: true,
      });
      if (mErr) console.error("❌ membership upsert failed:", mErr);

      // Reset plan & balance
      await resetPlanAndBalance(userId, plan.name, plan.quota);
      console.log(`✅ Initial subscription: ${plan.name}, balance=${plan.quota}`);
    }

    if (session.mode === "payment") {
      // One-time top-up
      const words = parseInt(session.metadata?.words || "0", 10);

      const { error: tErr } = await supabaseAdmin.from("topups").insert({
        user_id: userId,
        stripe_payment_id: session.payment_intent as string,
        words_added: words,
      });
      if (tErr) console.error("❌ topup insert failed:", tErr);

      const { error: bErr } = await supabaseAdmin.rpc("increment_balance", {
        uid: userId,
        amount: words,
      });
      if (bErr) console.error("❌ increment_balance failed:", bErr);

      console.log(`✅ Top-up: +${words} words for ${userId}`);
    }
  }

  // ======================================================
  // 2) Plan switch (upgrade/downgrade)
  // ======================================================
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;

    // Resolve userId from customer metadata
    let userId = (sub.customer as string) || "";
    try {
      const customer =
        typeof sub.customer === "string"
          ? await stripe.customers.retrieve(sub.customer)
          : sub.customer;
      // @ts-ignore
      userId = (customer?.metadata?.userId as string) || userId;
    } catch {}

    if (!userId) {
      console.error("❌ Missing userId on subscription.updated");
      return new Response("ok", { status: 200 });
    }

    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = planFromPriceId(priceId);
    if (!plan) {
      console.error("❌ Unknown plan on subscription.updated:", priceId);
      return new Response("ok", { status: 200 });
    }

    // Check old plan
    const { data: existing } = await supabaseAdmin
      .from("user_balance")
      .select("plan")
      .eq("user_id", userId)
      .single();

    const oldPlan = existing?.plan ?? "free";

    if (oldPlan !== plan.name) {
      await resetPlanAndBalance(userId, plan.name, plan.quota);

      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        stripe_subscription_id: sub.id,
        active: sub.status === "active" || sub.status === "trialing",
      });

      console.log(`🔄 Plan switched: ${oldPlan} → ${plan.name}, balance reset=${plan.quota}`);
    } else {
      // Just sync membership
      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        stripe_subscription_id: sub.id,
        active: sub.status === "active" || sub.status === "trialing",
      });

      console.log(`✅ subscription.updated: no change, synced ${plan.name}`);
    }
  }

  // ======================================================
  // 3) Monthly refill (each billing cycle)
  // ======================================================

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    
      if (invoice.billing_reason !== "subscription_cycle") {
        return new Response("ok", { status: 200 });
      }
    
      const subscriptionId = invoice.subscription ?? null;
      if (!subscriptionId) return new Response("ok", { status: 200 });
    
      const sub = await stripe.subscriptions.retrieve(subscriptionId);

    // Resolve userId
    let userId = (sub.customer as string) || "";
    try {
      const customer =
        typeof sub.customer === "string"
          ? await stripe.customers.retrieve(sub.customer)
          : sub.customer;
      // @ts-ignore
      userId = (customer?.metadata?.userId as string) || userId;
    } catch {}

    if (!userId) {
      console.error("❌ Missing userId on invoice.paid");
      return new Response("ok", { status: 200 });
    }

    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = planFromPriceId(priceId);
    if (!plan) {
      console.error("❌ Unknown plan on invoice.paid:", priceId);
      return new Response("ok", { status: 200 });
    }

    await resetPlanAndBalance(userId, plan.name, plan.quota);

    await supabaseAdmin.from("membership").upsert({
      user_id: userId,
      plan: plan.name,
      stripe_subscription_id: sub.id,
      active: sub.status === "active" || sub.status === "trialing",
    });

    console.log(`🗓️ Monthly refill: ${plan.name}, balance reset=${plan.quota} for ${userId}`);
  }

  return new Response("ok", { status: 200 });
}
