// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { planFromPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

/* ------------------------------ Helpers ---------------------------------- */

function getPeriod(sub: Stripe.Subscription) {
  const s = sub as any;
  const startUnix =
    s.current_period_start ?? s.trial_start ?? s.start_date ?? Math.floor(Date.now() / 1000);
  const endUnix =
    s.current_period_end ??
    s.trial_end ??
    (s.current_period_start ? s.current_period_start + 30 * 86400 : Math.floor(Date.now() / 1000 + 30 * 86400));
  return { start: new Date(startUnix * 1000).toISOString(), end: new Date(endUnix * 1000).toISOString() };
}

function getBillingInterval(sub: Stripe.Subscription): "monthly" | "yearly" {
  return sub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
}

async function getUserIdFromCustomerId(customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string> {
  if (!customerId) return "";
  let raw: Stripe.Customer | Stripe.DeletedCustomer;
  if (typeof customerId === "string") raw = await stripe.customers.retrieve(customerId);
  else raw = customerId;

  if ("deleted" in raw && raw.deleted) return "";
  const cust = raw as Stripe.Customer;
  return cust.metadata?.userId || "";
}

async function resetPlanAndBalance(userId: string, planName: string, quota: number) {
  const { error } = await supabaseAdmin
    .from("user_balance")
    .upsert(
      { user_id: userId, balance_words: quota, plan: planName, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) console.error("❌ resetPlanAndBalance failed:", error);
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
  const { userId, plan, billingInterval, start, end, sub, scheduledPlan = null, scheduledAt = null } = args;
  const { error } = await supabaseAdmin.from("membership").upsert(
    {
      user_id: userId,
      plan,
      billing_interval: billingInterval,
      scheduled_plan: scheduledPlan,
      scheduled_plan_effective_at: scheduledAt,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
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

function safePlanFromCurrent(sub: Stripe.Subscription) {
  const priceId = sub.items?.data?.[0]?.price?.id;
  return priceId ? planFromPriceId(priceId) : null;
}

function nextPlanFromPendingUpdate(sub: Stripe.Subscription) {
  const nextPriceId = (sub as any)?.pending_update?.subscription_items?.[0]?.price?.id as string | undefined;
  if (!nextPriceId) return null;
  return planFromPriceId(nextPriceId);
}

/* --------------------------- Webhook Handler ----------------------------- */

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("❌ Webhook signature error:", err);
    return new Response("Bad signature", { status: 400 });
  }

  // 1) checkout.session.completed (new sub or topup)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || "";
    if (!userId) return new Response("ok");

    if (session.mode === "subscription" && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const { start, end } = getPeriod(sub);
      const billingInterval = getBillingInterval(sub);
      const plan = safePlanFromCurrent(sub);
      if (!plan) return new Response("ok");

      await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
      await resetPlanAndBalance(userId, plan.name, plan.quota);
      return new Response("ok");
    }

    if (session.mode === "payment") {
      const words = parseInt(session.metadata?.words || "0", 10);
      if (words > 0) {
        await supabaseAdmin
          .from("topups")
          .upsert(
            { user_id: userId, stripe_payment_id: session.payment_intent as string, words_added: words },
            { onConflict: "stripe_payment_id" }
          );
        await supabaseAdmin.rpc("increment_balance", { uid: userId, amount: words });
      }
      return new Response("ok");
    }
    return new Response("ok");
  }

  // 2) customer.subscription.created (safety)
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = await getUserIdFromCustomerId(sub.customer);
    if (!userId) return new Response("ok");

    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);
    const plan = safePlanFromCurrent(sub);
    if (!plan) return new Response("ok");

    await upsertMembership({ userId, plan: plan.name, billingInterval, start, end, sub });
    await resetPlanAndBalance(userId, plan.name, plan.quota);
    return new Response("ok");
  }

  // 3) customer.subscription.updated (upgrades / downgrades)
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = await getUserIdFromCustomerId(sub.customer);
    if (!userId) return new Response("ok");

    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);

    const currentPlan = safePlanFromCurrent(sub);
    if (!currentPlan) return new Response("ok");

    const { data: membership } = await supabaseAdmin
      .from("membership")
      .select("plan, scheduled_plan, scheduled_plan_effective_at")
      .eq("user_id", userId)
      .maybeSingle();

    const oldPlan = membership?.plan ?? "free";
    const target = currentPlan.name;

    // Immediate upgrade (apply now)
    if (
      (oldPlan === "basic" && (target === "pro" || target === "ultra")) ||
      (oldPlan === "pro" && target === "ultra")
    ) {
      await resetPlanAndBalance(userId, target, currentPlan.quota);
      await upsertMembership({ userId, plan: target, billingInterval, start, end, sub });
      return new Response("ok");
    }

    // Scheduled downgrade via pending_update OR cancel_at_period_end
    const pendingNext = nextPlanFromPendingUpdate(sub);
    if (pendingNext) {
      const nextAt = new Date(((sub as any).pending_update.expires_at as number) * 1000).toISOString();
      await upsertMembership({
        userId,
        plan: oldPlan,
        billingInterval,
        start,
        end,
        sub,
        scheduledPlan: pendingNext.name,
        scheduledAt: nextAt,
      });
      return new Response("ok");
    }

    if ((sub as any).cancel_at_period_end) {
      const nextAt = new Date(((sub as any).current_period_end as number) * 1000).toISOString();
      // Decide what “downgrade” means here; default to free at period end
      await upsertMembership({
        userId,
        plan: oldPlan,
        billingInterval,
        start,
        end,
        sub,
        scheduledPlan: "free",
        scheduledAt: nextAt,
      });
      return new Response("ok");
    }

    // No change → just sync
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
    return new Response("ok");
  }

  // 4) invoice.paid (new cycle: refill + apply scheduled plan)
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    const reason = invoice.billing_reason ?? "";
    if (!["subscription_cycle", "subscription_create"].includes(reason)) return new Response("ok");
    if (!invoice.subscription) return new Response("ok");

    const sub = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = await getUserIdFromCustomerId(sub.customer);
    if (!userId) return new Response("ok");

    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);
    const plan = safePlanFromCurrent(sub);
    if (!plan) return new Response("ok");

    const { data: membership } = await supabaseAdmin
      .from("membership")
      .select("scheduled_plan, plan")
      .eq("user_id", userId)
      .maybeSingle();

    const finalPlan = membership?.scheduled_plan || plan.name;
    const quota =
      finalPlan === plan.name ? plan.quota : planFromPriceId(sub.items.data[0].price.id)?.quota ?? plan.quota;

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
    return new Response("ok");
  }

  // Unhandled events
  return new Response("ok");
}
