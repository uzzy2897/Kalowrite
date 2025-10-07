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
function getPeriod(sub: Stripe.Subscription) {
  const s = sub as any;
  const startUnix =
    s.current_period_start ?? s.start_date ?? Math.floor(Date.now() / 1000);
  const endUnix =
    s.current_period_end ??
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
async function resetPlanAndBalance(userId: string, plan: string, quota: number) {
  const { error } = await supabaseAdmin
    .from("user_balance")
    .upsert(
      {
        user_id: userId,
        balance_words: quota,
        plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error)
    console.error("❌ resetPlanAndBalance failed:", error);
  else
    console.log(`✅ Balance reset → ${quota} words (${plan}) for ${userId}`);
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
      stripe_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      scheduled_plan: scheduledPlan,
      scheduled_plan_effective_at: scheduledAt,
      started_at: start,
      ends_at: end,
      active: sub.status === "active" || sub.status === "trialing",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error)
    console.error("❌ upsertMembership failed:", error);
  else
    console.log(`✅ Membership synced for ${userId} → ${plan}`);
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
    return new Response(`Webhook error: ${(err as any).message}`, {
      status: 400,
    });
  }

  console.log("🔔 Stripe event:", event.type);

  /* ------------------------------------------------------------------------ */
  /* 1️⃣ checkout.session.completed → create membership / top-up             */
  /* ------------------------------------------------------------------------ */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) return new Response("Missing userId", { status: 400 });

    if (session.mode === "subscription" && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const { start, end } = getPeriod(sub);
      const billingInterval = getBillingInterval(sub);
      const plan = planFromPriceId(sub.items.data[0]?.price?.id);
      if (!plan) return new Response("Unknown plan", { status: 400 });

      console.log(`🆕 checkout.session.completed → ${plan.name} (${billingInterval}) for ${userId}`);

      await upsertMembership({
        userId,
        plan: plan.name,
        billingInterval,
        start,
        end,
        sub,
      });
      await resetPlanAndBalance(userId, plan.name, plan.quota);
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
      await supabaseAdmin.rpc("increment_balance", {
        uid: userId,
        amount: words,
      });
      console.log(`💰 Top-up: +${words} words for ${userId}`);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 2️⃣ customer.subscription.created → safety sync                          */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);
    const plan = planFromPriceId(sub.items.data[0]?.price?.id);
    if (!plan) return new Response("ok");

    let userId = "";
    try {
      const customer =
        typeof sub.customer === "string"
          ? await stripe.customers.retrieve(sub.customer)
          : sub.customer;
      // @ts-ignore
      userId = customer?.metadata?.userId || "";
    } catch (e) {
      console.error("❌ Could not resolve userId from customer:", e);
    }
    if (!userId) return new Response("ok");

    console.log(`🧾 Subscription.created → ${plan.name} (${billingInterval}) for ${userId}`);
    await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
    await resetPlanAndBalance(userId, plan.name, plan.quota);
  }

  /* ------------------------------------------------------------------------ */
  /* 3️⃣ customer.subscription.updated → upgrade/downgrade                    */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);
    const plan = planFromPriceId(sub.items.data[0]?.price?.id);
    if (!plan) return new Response("ok");

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

    const { data: membership } = await supabaseAdmin
      .from("membership")
      .select("plan, scheduled_plan, scheduled_plan_effective_at")
      .eq("user_id", userId)
      .maybeSingle();

    const oldPlan = membership?.plan ?? "free";
    const target = plan.name;

    console.log(`🔄 subscription.updated for ${userId}: ${oldPlan} → ${target}`);

    const isUpgrade =
      (oldPlan === "basic" && ["pro", "ultra"].includes(target)) ||
      (oldPlan === "pro" && target === "ultra");

    const isDowngrade =
      (oldPlan === "ultra" && ["pro", "basic"].includes(target)) ||
      (oldPlan === "pro" && ["basic", "free"].includes(target)) ||
      (oldPlan === "basic" && target === "free");

    if (isUpgrade) {
      await resetPlanAndBalance(userId, target, plan.quota);
      await upsertMembership({ userId, plan: target, billingInterval, start, end, sub });
      console.log(`⬆️ Upgrade applied immediately: ${oldPlan} → ${target}`);
    } else if (isDowngrade) {
      await upsertMembership({
        userId,
        plan: oldPlan,
        billingInterval,
        start,
        end,
        sub,
        scheduledPlan: target,
        scheduledAt: end,
      });
      console.log(`⏳ Downgrade scheduled at end: ${oldPlan} → ${target}`);
    } else {
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
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 4️⃣ invoice.paid → cycle refill / apply scheduled downgrade              */
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
      const plan = planFromPriceId(sub.items.data[0]?.price?.id);
      if (!plan) return new Response("ok");

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

      const { data: membership } = await supabaseAdmin
        .from("membership")
        .select("scheduled_plan, plan")
        .eq("user_id", userId)
        .maybeSingle();

      const finalPlan = membership?.scheduled_plan || plan.name;
      const quota = plan.quota;

      if (membership?.scheduled_plan && membership.scheduled_plan !== plan.name) {
        console.log(`🔄 Applying scheduled downgrade: ${membership.plan} → ${finalPlan}`);
      }

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

      console.log(`🗓️ Renewal cycle → ${finalPlan} (${billingInterval}) for ${userId}`);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 5️⃣ customer.subscription.deleted → cancel plan                         */
  /* ------------------------------------------------------------------------ */
  if (event.type === "customer.subscription.deleted") {
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
    if (!userId) return new Response("ok");

    await upsertMembership({
      userId,
      plan: "free",
      billingInterval: "monthly",
      start: null,
      end: null,
      sub,
    });
    await resetPlanAndBalance(userId, "free", 500);
    console.log(`❌ Subscription cancelled → ${userId} downgraded to free`);
  }

  return new Response("ok", { status: 200 });
}
