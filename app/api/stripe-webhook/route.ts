// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { planFromPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

/* -------------------------------------------------------------------------- */
/* 🕒 PERIOD + BILLING HELPERS                                                */
/* -------------------------------------------------------------------------- */
function getPeriod(sub: Stripe.Subscription): { start: string | null; end: string | null } {
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

  if (error) console.error("❌ resetPlanAndBalance failed:", error);
  else console.log(`✅ Balance reset → ${quota} words (${planName}) for ${userId}`);
}

async function upsertMembership(args: {
  userId: string;
  plan: string;
  billingInterval: "monthly" | "yearly";
  start: string | null;
  end: string | null;
  sub: Stripe.Subscription;
  scheduledPlan?: string | null;
  scheduledAt?: string | null;
}) {
  const {
    userId,
    plan,
    billingInterval,
    start,
    end,
    sub,
    scheduledPlan = null,
    scheduledAt = null,
  } = args;

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
/* 🚀 MAIN STRIPE WEBHOOK HANDLER                                             */
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
  /* 1️⃣ checkout.session.completed → create membership immediately          */
  /* ------------------------------------------------------------------------ */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) return new Response("Missing userId", { status: 400 });

    if (session.mode === "subscription") {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const { start, end } = getPeriod(sub);
      const billingInterval = getBillingInterval(sub);
      const plan = planFromPriceId(sub.items.data[0]?.price?.id);
      if (!plan) return new Response("Unknown plan", { status: 400 });

      await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
      await resetPlanAndBalance(userId, plan.name, plan.quota);

      console.log(`🆕 Subscription created via checkout.session.completed for ${userId}`);
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
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 2️⃣ customer.subscription.created → redundant safety insertion          */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);

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
    if (!plan) return new Response("ok");

    await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
    await resetPlanAndBalance(userId, plan.name, plan.quota);

    console.log(`🧾 customer.subscription.created handled for ${userId}`);
  }

  /* ------------------------------------------------------------------------ */
/* 3️⃣ customer.subscription.updated → upgrades/downgrades handling        */
/* ------------------------------------------------------------------------ */
if (event.type === "customer.subscription.updated") {
  const sub = event.data.object as Stripe.Subscription;
  const { start, end } = getPeriod(sub);
  const billingInterval = getBillingInterval(sub);

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
  if (!plan) return new Response("ok");

  const { data: membership } = await supabaseAdmin
    .from("membership")
    .select("plan, scheduled_plan, scheduled_plan_effective_at")
    .eq("user_id", userId)
    .maybeSingle();

  const oldPlan = membership?.plan ?? "free";
  const target = plan.name;

  /* ✅ UPGRADE (immediate) */
  if (
    (oldPlan === "basic" && ["pro", "ultra"].includes(target)) ||
    (oldPlan === "pro" && target === "ultra")
  ) {
    await resetPlanAndBalance(userId, target, plan.quota);
    await upsertMembership({ userId, plan: target, billingInterval, start, end, sub });
    console.log(`⬆️ Upgrade applied: ${oldPlan} → ${target}`);
  }

  /* ✅ DOWNGRADE (scheduled via portal) */
  else if (sub.cancel_at_period_end) {
    const nextPlan = membership?.scheduled_plan ?? target;
    await upsertMembership({
      userId,
      plan: oldPlan,
      billingInterval,
      start,
      end,
      sub,
      scheduledPlan: nextPlan,
      scheduledAt: end,
    });
    console.log(`⏳ Downgrade scheduled at period end: ${oldPlan} → ${nextPlan}`);
  }

  /* ✅ Normal plan update (immediate, same or resync) */
  else {
    await upsertMembership({
      userId,
      plan: target,
      billingInterval,
      start,
      end,
      sub,
      scheduledPlan: membership?.scheduled_plan ?? null,
      scheduledAt: membership?.scheduled_plan_effective_at ?? null,
    });
    console.log(`🔄 Plan synced: ${oldPlan} → ${target}`);
  }
}

  /* ------------------------------------------------------------------------ */
  /* 4️⃣ invoice.paid → refill next cycle & apply downgrade if scheduled      */
  /* ------------------------------------------------------------------------ */
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    const reason = invoice.billing_reason ?? "";
    if (!["subscription_cycle", "subscription_create"].includes(reason))
      return new Response("ok");

    if (invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const { start, end } = getPeriod(sub);
      const billingInterval = getBillingInterval(sub);

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
      if (!plan) return new Response("ok");

      const { data: membership } = await supabaseAdmin
        .from("membership")
        .select("scheduled_plan, plan")
        .eq("user_id", userId)
        .maybeSingle();

      const finalPlan = membership?.scheduled_plan || plan.name;
      const previousPlan = membership?.plan;
      const quota =
        finalPlan === plan.name
          ? plan.quota
          : planFromPriceId(sub.items.data[0].price.id)?.quota ?? plan.quota;

      if (finalPlan !== previousPlan)
        console.log(`🔄 Plan change: ${previousPlan} → ${finalPlan}`);

      await resetPlanAndBalance(userId, finalPlan, quota);
      await upsertMembership({
        userId,
        plan: finalPlan,
        billingInterval,
        start,
        end,
        sub,
        scheduledPlan: null,
        scheduledAt: null,
      });

      console.log(`🗓️ Cycle refill → ${finalPlan} (${billingInterval}) for ${userId}`);
    }
  }

  return new Response("ok", { status: 200 });
}