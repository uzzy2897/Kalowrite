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

export async function POST(req: Request) {
  const payload = await req.text();
  const headerPayload = await headers();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id")!,
    "svix-timestamp": headerPayload.get("svix-timestamp")!,
    "svix-signature": headerPayload.get("svix-signature")!,
  };

  // 1. Verify Clerk signature
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;
  try {
    evt = wh.verify(payload, svixHeaders) as ClerkWebhookEvent;
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("📩 Clerk event received:", evt.type);

  // Only handle subscription lifecycle events
  if (
    evt.type === "subscription.created" ||
    evt.type === "subscription.updated" ||
    evt.type === "subscription.canceled"
  ) {
    const sub = evt.data;
    console.log("📦 Subscription payload:", JSON.stringify(sub, null, 2));

    // --- 2. Get user_id directly from payer
    const userId = sub?.payer?.user_id ?? null;
    if (!userId) {
      console.error("⚠️ No user_id found in subscription payload");
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    // --- 3. Upsert subscription
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

    // --- 4. Upsert subscription items
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
          period_end: item.period_end
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

      // --- 5. Update user balance based on plan
      const mainPlan = itemRecords[0];
      if (mainPlan?.plan_slug) {
        const slug = mainPlan.plan_slug.toLowerCase();
        console.log("🔎 Normalized plan slug:", slug);

        // match Clerk's actual slugs
        const PLAN_BALANCES: Record<string, number> = {
          free_user: 100,
          basic: 500,
          pro: 1500,
          ultra: 3000,
        };

        let balance = PLAN_BALANCES[slug] ?? 0;

        // --- Check for free trial abuse ---
        if (slug === "free_user") {
          const { data: existingUser } = await supabaseAdmin
            .from("user_balances")
            .select("free_trial_used, balance")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingUser?.free_trial_used) {
            console.log("⚠️ Trial already used, forcing balance = 0");
            balance = 0;
          }
        }

        const { error: balanceError } = await supabaseAdmin
          .from("user_balances")
          .upsert(
            {
              user_id: userId,
              balance,
              plan: slug,
              updated_at: new Date().toISOString(),
              free_trial_used: slug === "free_user" ? true : undefined,
            },
            { onConflict: "user_id" }
          );

        if (balanceError) {
          console.error("❌ Supabase user_balances insert error:", balanceError);
          return NextResponse.json(
            { error: "Balance DB error" },
            { status: 500 }
          );
        }

        console.log(`✅ Balance set for ${userId}: ${balance} words (plan: ${slug})`);
      }
    }

    console.log("✅ Subscription synced:", subscriptionRecord);
  }

  return NextResponse.json({ ok: true });
}