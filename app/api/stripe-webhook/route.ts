import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { planFromPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

/* -------------------------------------------------------------------------- */
/* ✅ Helper utilities */
/* -------------------------------------------------------------------------- */

// Convert Stripe period timestamps → ISO
function getPeriod(sub: Stripe.Subscription) {
  const start = (sub as any)?.current_period_start
    ? new Date((sub as any).current_period_start * 1000).toISOString()
    : null;
  const end = (sub as any)?.current_period_end
    ? new Date((sub as any).current_period_end * 1000).toISOString()
    : null;
  return { start, end };
}

// Extract billing interval (monthly / yearly)
function getBillingInterval(sub: Stripe.Subscription) {
  return sub.items.data[0]?.price?.recurring?.interval || "monthly";
}

// Reset plan balance on renewal
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

/* -------------------------------------------------------------------------- */
/* ✅ Main webhook handler */
/* -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------- */
  /* 1️⃣ Checkout completed */
  /* -------------------------------------------------------------------------- */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) return new Response("Missing userId", { status: 400 });

    // 🟢 New subscription
    if (session.mode === "subscription") {
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const price = items.data[0]?.price;
      const plan = planFromPriceId(price?.id);
      if (!plan) return new Response("Unknown plan", { status: 400 });

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const { start, end } = getPeriod(sub);
      const billingInterval = getBillingInterval(sub);

      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        billing_interval: billingInterval,
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        stripe_subscription_id: sub.id,
        started_at: start,
        ends_at: end,
        active: sub.status === "active" || sub.status === "trialing",
      });

      await resetPlanAndBalance(userId, plan.name, plan.quota);
      console.log(`🆕 Subscription created: ${plan.name} (${billingInterval}) for ${userId}`);
    }

    // 💵 One-time top-up
    if (session.mode === "payment") {
      const words = parseInt(session.metadata?.words || "0", 10);
      await supabaseAdmin.from("topups").upsert(
        {
          user_id: userId,
          stripe_payment_id: session.payment_intent as string,
          words_added: words,
        },
        { onConflict: "stripe_payment_id" }
      );
      await supabaseAdmin.rpc("increment_balance", { uid: userId, amount: words });
      console.log(`✅ Top-up: +${words} words for ${userId}`);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 2️⃣ Subscription updated (upgrade / scheduled downgrade) */
  /* -------------------------------------------------------------------------- */
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const { start, end } = getPeriod(sub);
    const billingInterval = getBillingInterval(sub);

    // Retrieve userId
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
      .select("plan, scheduled_plan")
      .eq("user_id", userId)
      .single();

    const oldPlan = membership?.plan ?? "free";

    // ⬆️ Upgrade → apply immediately
    if (
      (oldPlan === "basic" && ["pro", "ultra"].includes(plan.name)) ||
      (oldPlan === "pro" && plan.name === "ultra")
    ) {
      await resetPlanAndBalance(userId, plan.name, plan.quota);
      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        billing_interval: billingInterval,
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        stripe_subscription_id: sub.id,
        started_at: start,
        ends_at: end,
        active: sub.status === "active" || sub.status === "trialing",
      });
      console.log(`⬆️ Upgrade applied: ${oldPlan} → ${plan.name}`);
    }

    // 🔽 Downgrade → schedule it
    else if (
      (oldPlan === "ultra" && ["pro", "basic"].includes(plan.name)) ||
      (oldPlan === "pro" && plan.name === "basic") ||
      (oldPlan === "pro" && plan.name === "free") ||
      (oldPlan === "basic" && plan.name === "free")
    ) {
      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: oldPlan,
        billing_interval: billingInterval,
        scheduled_plan: plan.name,
        scheduled_plan_effective_at: end,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        stripe_subscription_id: sub.id,
        started_at: start,
        ends_at: end,
        active: sub.status === "active" || sub.status === "trialing",
      });
      console.log(`⏳ Downgrade scheduled: ${oldPlan} → ${plan.name}`);
    }

    // ↔️ Same plan → just sync
    else {
      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: plan.name,
        billing_interval: billingInterval,
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        stripe_subscription_id: sub.id,
        started_at: start,
        ends_at: end,
        active: sub.status === "active" || sub.status === "trialing",
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 3️⃣ Invoice paid → new cycle / apply scheduled downgrade */
  /* -------------------------------------------------------------------------- */
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    if (invoice.billing_reason !== "subscription_cycle") return new Response("ok");

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
        .select("scheduled_plan")
        .eq("user_id", userId)
        .single();

      const finalPlan = membership?.scheduled_plan || plan.name;
      const quota = plan.quota ?? 500;

      await resetPlanAndBalance(userId, finalPlan, quota);

      await supabaseAdmin.from("membership").upsert({
        user_id: userId,
        plan: finalPlan,
        billing_interval: billingInterval,
        scheduled_plan: null,
        scheduled_plan_effective_at: null,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        stripe_subscription_id: sub.id,
        started_at: start,
        ends_at: end,
        active: sub.status === "active" || sub.status === "trialing",
      });

      console.log(`🗓️ Cycle refill → ${finalPlan} (${billingInterval}) for ${userId}`);
    }
  }

  return new Response("ok", { status: 200 });
}
