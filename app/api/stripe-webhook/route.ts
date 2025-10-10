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
  
    /* -------------------------------------------------------------------------- */
    /* 🧾 SUBSCRIPTION HANDLER                                                   */
    /* -------------------------------------------------------------------------- */
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
    }
  
    /* -------------------------------------------------------------------------- */
    /* 💰 ONE-TIME PAYMENT (TOP-UP)                                              */
    /* -------------------------------------------------------------------------- */
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
  
    /* -------------------------------------------------------------------------- */
    /* 📣 FACEBOOK CAPI (NON-BLOCKING)                                           */
    /* -------------------------------------------------------------------------- */
    try {
      // 🧠 Get FB cookies for better event matching
      const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];
      const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];
    
      // 🧱 Build full payload for Purchase CAPI event
      const fbPayload = {
        eventId: session.id, // Unique event/session ID (used for deduplication)
        email: session.customer_details?.email,
        value: session.amount_total ? session.amount_total / 100 : 0, // Convert cents to dollars
        currency: session.currency?.toUpperCase() || "USD",
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://kalowrite.com",
    
        // Optional advanced matching parameters
        fbp,
        fbc,
        external_id: session.customer_details?.email, // or your internal user ID
        // phone: customer_phone || undefined,
        // fn: customer_first_name || undefined,
        // ln: customer_last_name || undefined,
        // ct: customer_city || undefined,
        // st: customer_state || undefined,
        // zip: customer_zip || undefined,
        // dob: customer_birthdate || undefined,
      };
    
      // 🚀 Fire & forget (don’t await to keep Stripe fast)
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/fb/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fbPayload),
      }).catch((err) => console.warn("⚠️ Facebook CAPI call failed:", err));
    } catch (err) {
      console.warn("⚠️ Facebook CAPI error:", err);
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
  /* 3️⃣ customer.subscription.updated (portal upgrades/downgrades)           */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.updated") {
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
// 🔮 Check for scheduled plan change safely
let scheduledPlan: string | null = null;
let scheduledAt: string | null = null;

if (sub.schedule) {
  try {
    let scheduleObj: Stripe.SubscriptionSchedule | null = null;

    if (typeof sub.schedule === "string") {
      scheduleObj = await stripe.subscriptionSchedules.retrieve(sub.schedule);
    } else if (typeof sub.schedule === "object") {
      scheduleObj = sub.schedule as Stripe.SubscriptionSchedule;
    }

    const nextPhase = scheduleObj?.phases?.[1];
    const priceObj = nextPhase?.items?.[0]?.price;
    let nextPlanId: string | null = null;

    if (typeof priceObj === "string") {
      nextPlanId = priceObj;
    } else if (priceObj && "id" in priceObj) {
      nextPlanId = priceObj.id;
    }

    if (nextPlanId) {
      scheduledPlan = planFromPriceId(nextPlanId)?.name || null;
    }

    scheduledAt = nextPhase?.start_date
      ? new Date(nextPhase.start_date * 1000).toISOString()
      : null;
  } catch (err) {
    console.warn("⚠️ Failed to fetch schedule:", err);
  }
}


    await upsertMembership({
      userId,
      plan: plan.name,
      billingInterval,
      start,
      end,
      sub,
      scheduledPlan,
      scheduledAt,
    });

    console.log(
      `🆙 Subscription updated → ${plan.name} (scheduled → ${scheduledPlan ?? "none"})`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 4️⃣ subscription_schedule.created (scheduled change created)             */
  /* ------------------------------------------------------------------------ */
  if (event.type === "subscription_schedule.created") {
    const schedule = event.data.object as Stripe.SubscriptionSchedule;
    const sub = (await stripe.subscriptions.retrieve(
      schedule.subscription as string
    )) as Stripe.Subscription;

    const customer =
      typeof sub.customer === "string"
        ? ((await stripe.customers.retrieve(sub.customer)) as Stripe.Customer)
        : (sub.customer as Stripe.Customer);
    const userId = (customer as any)?.metadata?.userId || "";
    if (!userId) return new Response("ok");

    const currentPlan = planFromPriceId(sub.items.data[0]?.price?.id);
    const nextPhase = schedule.phases?.[1];
    const nextPriceId = nextPhase?.items?.[0]?.price;
    const nextPlan = nextPriceId ? planFromPriceId(nextPriceId as string) : null;
    const nextStart = nextPhase?.start_date
      ? new Date(nextPhase.start_date * 1000).toISOString()
      : null;

    if (!nextPlan) return new Response("ok");

    await upsertMembership({
      userId,
      plan: currentPlan?.name ?? "free",
      billingInterval: getBillingInterval(sub),
      start: new Date((sub as any).current_period_start * 1000).toISOString(),
      end: new Date((sub as any).current_period_end * 1000).toISOString(),
      sub,
      scheduledPlan: nextPlan.name,
      scheduledAt: nextStart,
    });

    console.log(`⏳ Scheduled plan: ${currentPlan?.name} → ${nextPlan.name}`);
  }

  /* ------------------------------------------------------------------------ */
  /* 5️⃣ subscription_schedule.canceled (cleanup)                             */
  /* ------------------------------------------------------------------------ */
  if (event.type === "subscription_schedule.canceled") {
    const schedule = event.data.object as Stripe.SubscriptionSchedule;
    const customer = await stripe.customers.retrieve(schedule.customer as string);
    const userId = (customer as any)?.metadata?.userId || "";
    if (!userId) return new Response("ok");

    await supabaseAdmin
      .from("membership")
      .update({
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    console.log(`🧹 Scheduled plan canceled for ${userId}`);
  }

  /* ------------------------------------------------------------------------ */
  /* 6️⃣ customer.subscription.deleted (cancellation)                         */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customer =
      typeof sub.customer === "string"
        ? ((await stripe.customers.retrieve(sub.customer)) as Stripe.Customer)
        : (sub.customer as Stripe.Customer);
    const userId = (customer as any)?.metadata?.userId || "";
    if (!userId) return new Response("ok");

    await supabaseAdmin
      .from("membership")
      .update({
        plan: "free",
        active: false,
        stripe_subscription_id: null,
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await resetPlanAndBalance(userId, "free", 500);
    console.log(`🚫 Subscription canceled for ${userId}`);
  }

  /* ------------------------------------------------------------------------ */
  /* 7️⃣ invoice.paid → apply scheduled downgrade or refill                   */
  /* ------------------------------------------------------------------------ */
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    if (!invoice.subscription) return new Response("ok");

    const sub = (await stripe.subscriptions.retrieve(
      invoice.subscription
    )) as Stripe.Subscription;

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
      console.log(`🔄 Plan switch: ${previousPlan} → ${finalPlan}`);

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

  return new Response("ok", { status: 200 });
}