import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { planFromPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

/* -------------------------------------------------------------------------- */
/* 🕒 HELPERS                                                                 */
/* -------------------------------------------------------------------------- */
function getPeriod(sub: Stripe.Subscription) {
  const s = sub as any;
  const startUnix =
    s.current_period_start ??
    s.trial_start ??
    s.start_date ??
    Math.floor(Date.now() / 1000);

  const endUnix =
    s.current_period_end ??
    s.trial_end ??
    (s.current_period_start
      ? s.current_period_start + 30 * 86400
      : Math.floor(Date.now() / 1000 + 30 * 86400));

  return {
    start: new Date(startUnix * 1000).toISOString(),
    end: new Date(endUnix * 1000).toISOString(),
  };
}

function getBillingInterval(sub: Stripe.Subscription): "monthly" | "yearly" {
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  return interval === "year" ? "yearly" : "monthly";
}

/* -------------------------------------------------------------------------- */
/* 💾 SUPABASE HELPERS                                                        */
/* -------------------------------------------------------------------------- */
async function resetPlanAndBalance(userId: string, planName: string, quota: number) {
  const { error } = await supabaseAdmin
    .from("user_balance")
    .upsert(
      {
        user_id: userId,
        balance_words: quota,
        plan: planName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error)
    console.error("❌ resetPlanAndBalance failed:", error);
  else
    console.log(`✅ Balance reset → ${quota} words (${planName}) for ${userId}`);
}

async function upsertMembership({
  userId,
  plan,
  billingInterval,
  start,
  end,
  sub,
  scheduledPlan = null,
  scheduledAt = null,
}: {
  userId: string;
  plan: string;
  billingInterval: "monthly" | "yearly";
  start: string | null;
  end: string | null;
  sub: Stripe.Subscription;
  scheduledPlan?: string | null;
  scheduledAt?: string | null;
}) {
  const { error } = await supabaseAdmin.from("membership").upsert(
    {
      user_id: userId,
      plan,
      billing_interval: billingInterval,
      scheduled_plan: scheduledPlan,
      scheduled_plan_effective_at: scheduledAt,
      stripe_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      started_at: start,
      ends_at: end,
      active: sub.status === "active" || sub.status === "trialing",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("❌ upsertMembership failed:", error);
}

/* -------------------------------------------------------------------------- */
/* 📣 FACEBOOK CONVERSION API (CAPI)                                          */
/* -------------------------------------------------------------------------- */
async function sendFacebookEvent({
  eventName,
  email,
  fbc,
  fbp,
  eventId,
}: {
  eventName: "Subscribe" | "Purchase";
  email?: string;
  fbc?: string;
  fbp?: string;
  eventId?: string;
}) {
  if (!process.env.FB_ACCESS_TOKEN || !process.env.FB_PIXEL_ID) return;

  const url = `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events`;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || `evt_${Date.now()}`,
        action_source: "website",
        event_source_url: "https://kalowrite.com/pricing",
        user_data: {
          em: email ? [email.trim().toLowerCase()] : [],
          fbc: fbc ? [fbc] : [],
          fbp: fbp ? [fbp] : [],
        },
      },
    ],
    access_token: process.env.FB_ACCESS_TOKEN,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("📤 Facebook CAPI response:", data);
  } catch (err) {
    console.error("❌ Facebook CAPI error:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🚀 STRIPE WEBHOOK HANDLER                                                  */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
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

  console.log("🔔 Stripe event:", event.type);

  /* ------------------------------------------------------------------------ */
  /* 1️⃣ checkout.session.completed                                           */
  /* ------------------------------------------------------------------------ */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) return new Response("Missing userId", { status: 400 });

    const fbc = session.metadata?.fbc;
    const fbp = session.metadata?.fbp;

    // Try to find user's email
    const email =
      session.customer_details?.email || session.customer_email || undefined;

    if (session.mode === "subscription") {
      const sub = (await stripe.subscriptions.retrieve(
        session.subscription as string
      )) as Stripe.Subscription;

      const { start, end } = getPeriod(sub);
      const billingInterval = getBillingInterval(sub);
      const plan = planFromPriceId(sub.items.data[0]?.price?.id);
      if (!plan) return new Response("Unknown plan", { status: 400 });

      await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
      await resetPlanAndBalance(userId, plan.name, plan.quota);

      console.log(`🆕 New subscription created for ${userId}`);

      // ✅ Send Facebook Subscribe event
      await sendFacebookEvent({
        eventName: "Subscribe",
        email,
        fbc,
        fbp,
        eventId: session.id,
      });
    }

    if (session.mode === "payment") {
      const words = parseInt(session.metadata?.words || "0", 10);
      await supabaseAdmin
        .from("topups")
        .upsert(
          {
            user_id: userId,
            stripe_payment_id: session.payment_intent as string,
            words_added: words,
          },
          { onConflict: "stripe_payment_id" }
        );

      await supabaseAdmin.rpc("increment_balance", { uid: userId, amount: words });

      console.log(`💰 Top-up → +${words} words for ${userId}`);

      // ✅ Send Facebook Purchase event
      await sendFacebookEvent({
        eventName: "Purchase",
        email,
        fbc,
        fbp,
        eventId: session.id,
      });
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 2️⃣ customer.subscription.created                                        */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);

    const customer =
      typeof sub.customer === "string"
        ? ((await stripe.customers.retrieve(sub.customer)) as Stripe.Customer)
        : (sub.customer as Stripe.Customer);
    const userId = (customer as any)?.metadata?.userId || "";
    if (!userId) return new Response("ok");

    const plan = planFromPriceId(sub.items.data[0]?.price?.id);
    if (!plan) return new Response("ok");

    await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
    await resetPlanAndBalance(userId, plan.name, plan.quota);
    console.log(`🧾 Subscription created (safety) for ${userId}`);
  }

  /* ------------------------------------------------------------------------ */
  /* (Other Stripe events remain unchanged)                                   */
  /* ------------------------------------------------------------------------ */
  // ⚙️ You keep all your existing subscription.updated, invoice.paid, etc.

  return new Response("ok", { status: 200 });
}
