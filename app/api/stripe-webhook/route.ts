// app/api/webhook/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { planFromPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

async function resetPlanAndBalance(userId: string, planName: string, quota: number) {
  const { error } = await supabaseAdmin
    .from("user_balance")
    .upsert({
      user_id: userId,
      balance_words: quota,
      plan: planName,
      updated_at: new Date().toISOString(),
    });

  if (error) console.error("❌ resetPlanAndBalance failed:", error);
  else console.log(`✅ Balance reset → ${quota}, plan=${planName} for ${userId}`);
}

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("❌ Webhook signature error:", err);
    return new Response(`Webhook error: ${err}`, { status: 400 });
  }

  console.log("🔔 Stripe event:", event.type);

  // -------------------------------
  // 1. Checkout Completed
  // -------------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) return new Response("Missing userId", { status: 400 });

    if (session.mode === "subscription") {
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const plan = planFromPriceId(items.data[0]?.price?.id);
      if (!plan) return new Response("Unknown plan", { status: 400 });

      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        stripe_subscription_id: session.subscription as string,
        active: true,
      });

      await resetPlanAndBalance(userId, plan.name, plan.quota);
    }

    if (session.mode === "payment") {
      const words = parseInt(session.metadata?.words || "0", 10);

      // ✅ idempotent insert (avoid duplicates if retried)
      await supabaseAdmin.from("topups").upsert(
        {
          user_id: userId,
          stripe_payment_id: session.payment_intent as string,
          words_added: words,
        },
        { onConflict: "stripe_payment_id" }
      );

      await supabaseAdmin.rpc("increment_balance", { uid: userId, amount: words });
      console.log(`✅ Top-up: +${words} for ${userId}`);
    }
  }

  // -------------------------------
  // 2. Subscription Updated (upgrade/downgrade)
  // -------------------------------
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    let userId = "";

    try {
      const customer =
        typeof sub.customer === "string"
          ? await stripe.customers.retrieve(sub.customer)
          : sub.customer;
      // @ts-ignore
      userId = customer?.metadata?.userId || "";
    } catch {}

    if (!userId) return new Response("ok", { status: 200 });

    const plan = planFromPriceId(sub.items?.data?.[0]?.price?.id);
    if (!plan) return new Response("ok", { status: 200 });

    const { data: existing } = await supabaseAdmin
      .from("user_balance")
      .select("plan")
      .eq("user_id", userId)
      .single();

    const oldPlan = existing?.plan ?? "free";

    if (oldPlan !== plan.name) {
      if (
        (oldPlan === "basic" && ["pro", "ultra"].includes(plan.name)) ||
        (oldPlan === "pro" && plan.name === "ultra")
      ) {
        // ✅ Upgrade → apply immediately
        await resetPlanAndBalance(userId, plan.name, plan.quota);
        console.log(`⬆️ Upgrade applied: ${oldPlan} → ${plan.name}`);
      } else {
        // 🔽 Downgrade → schedule, don't reset yet
        console.log(`⏳ Downgrade scheduled: ${oldPlan} → ${plan.name} (applied at cycle end)`);
      }
    }

    // Always keep membership in sync
    await supabaseAdmin.from("membership").upsert({
      user_id: userId,
      plan: plan.name,
      stripe_subscription_id: sub.id,
      active: sub.status === "active" || sub.status === "trialing",
    });
  }

  // -------------------------------
  // 3. Refill (monthly or yearly billing cycle)
  // -------------------------------
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    if (invoice.billing_reason !== "subscription_cycle") return new Response("ok");

    if (invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      let userId = "";

      try {
        const customer =
          typeof sub.customer === "string"
            ? await stripe.customers.retrieve(sub.customer)
            : sub.customer;
        // @ts-ignore
        userId = customer?.metadata?.userId || "";
      } catch {}

      if (!userId) return new Response("ok");

      const plan = planFromPriceId(sub.items?.data?.[0]?.price?.id);
      if (plan) {
        await resetPlanAndBalance(userId, plan.name, plan.quota);
        await supabaseAdmin.from("membership").upsert({
          user_id: userId,
          plan: plan.name,
          stripe_subscription_id: sub.id,
          active: sub.status === "active" || sub.status === "trialing",
        });

        console.log(`🗓️ Billing cycle refill: ${plan.name}, reset=${plan.quota} for ${userId}`);
      }
    }
  }

  return new Response("ok", { status: 200 });
}
