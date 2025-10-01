// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET!;

interface ClerkWebhookEvent {
  object: string;
  type: string;
  data: any;
}

const PLAN_BALANCES: Record<string, number> = {
  free_user: 500,
  basic: 500,
  pro: 1500,
  ultra: 3000,
};

export async function POST(req: Request) {
  const payload = await req.text();
  const headerPayload = await headers();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id")!,
    "svix-timestamp": headerPayload.get("svix-timestamp")!,
    "svix-signature": headerPayload.get("svix-signature")!,
  };

  // 1) Verify Clerk signature
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;
  try {
    evt = wh.verify(payload, svixHeaders) as ClerkWebhookEvent;
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("📩 Clerk event received:", evt.type);

  // 2) Handle subscription lifecycle events only
  if (
    evt.type === "subscription.created" ||
    evt.type === "subscription.updated" ||
    evt.type === "subscription.canceled"
  ) {
    const sub = evt.data;
    console.log("📦 Subscription payload:", JSON.stringify(sub, null, 2));

    // 3) Extract user id (supports user, user_id, payer.user_id)
    const userId =
      sub?.user ??
      sub?.user_id ??
      sub?.payer?.user_id ??
      null;

    if (!userId) {
      console.error("⚠️ Missing user/user_id in subscription payload");
      return NextResponse.json({ error: "UserId missing" }, { status: 400 });
    }

    // 4) Upsert subscription record
    const subscriptionRecord = {
      id: sub.id,
      user_id: userId,
      status: sub.status,
      latest_payment_id: sub.latest_payment_id ?? null,
      created_at: sub.created_at
        ? new Date(sub.created_at).toISOString()
        : new Date().toISOString(),
      updated_at: sub.updated_at
        ? new Date(sub.updated_at).toISOString()
        : new Date().toISOString(),
    };

    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(subscriptionRecord, { onConflict: "id" });

    if (subError) {
      console.error("❌ Supabase subscription insert error:", subError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // 5) Upsert subscription items (if present)
    let slugFromItems: string | null = null;
    if (Array.isArray(sub.items)) {
      const itemRecords = sub.items.map((item: any) => {
        const plan = item.plan ?? {};
        return {
          id: item.id,
          subscription_id: sub.id,
          plan_id: plan.id ?? null,
          plan_name: plan.name ?? null,
          plan_slug: plan.slug ?? null,
          price: plan.amount ?? null,
          currency: plan.currency ?? null,
          interval: item.interval ?? plan.interval ?? null,
          status: item.status,
          period_start: item.period_start
            ? new Date(item.period_start).toISOString()
            : null,
          // ✅ Guard against invalid negative timestamps
          period_end:
            item.period_end && item.period_end > 0
              ? new Date(item.period_end).toISOString()
              : null,
        };
      });

      const { error: itemsError } = await supabaseAdmin
        .from("subscription_items")
        .upsert(itemRecords, { onConflict: "id" });

      if (itemsError) {
        console.error("❌ Supabase subscription_items insert error:", itemsError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      console.log("✅ Subscription items synced:", itemRecords);

      // prefer first item's slug if available
      slugFromItems = itemRecords[0]?.plan_slug
        ? String(itemRecords[0].plan_slug).toLowerCase()
        : null;
    }

    // 6) Balance update logic
    let nextPlanSlug: string | null = slugFromItems;

    // If event is canceled, force balance to 0 and plan to "free_user"
    if (evt.type === "subscription.canceled") {
      nextPlanSlug = "free_user";
    }

    if (nextPlanSlug) {
      const normalized = nextPlanSlug.toLowerCase();
      const nextBalance =
        evt.type === "subscription.canceled"
          ? 0
          : PLAN_BALANCES[normalized] ?? 0;

      const { error: balanceError } = await supabaseAdmin
        .from("user_balances")
        .upsert(
          {
            user_id: userId,
            balance: nextBalance,
            plan: normalized,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (balanceError) {
        console.error("❌ Supabase user_balances insert error:", balanceError);
        return NextResponse.json({ error: "Balance DB error" }, { status: 500 });
      }

      console.log(
        `✅ Balance set for ${userId}: ${nextBalance} (plan: ${normalized}, event: ${evt.type})`
      );
    } else {
      console.log("ℹ️ No plan slug found in items; skipped balance update.");
    }

    console.log("✅ Subscription synced:", subscriptionRecord);
  }

  return NextResponse.json({ ok: true });
}
