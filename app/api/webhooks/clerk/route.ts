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

  if (
    evt.type === "subscription.created" ||
    evt.type === "subscription.updated" ||
    evt.type === "subscription.canceled"
  ) {
    const sub = evt.data;
    console.log("📦 Subscription payload:", JSON.stringify(sub, null, 2));

    const userId = sub?.payer?.user_id ?? null;
    const email = sub?.payer?.email_addresses?.[0]?.email_address ?? null;

    if (!userId || !email) {
      console.error("⚠️ Missing user_id or email in subscription payload");
      return NextResponse.json({ error: "User data missing" }, { status: 400 });
    }

    // --- Save subscription info ---
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

    await supabaseAdmin.from("subscriptions").upsert(subscriptionRecord, { onConflict: "id" });

    // --- Handle plan balance ---
    if (Array.isArray(sub.items)) {
      const mainPlan = sub.items[0]?.plan;
      if (mainPlan?.slug) {
        const slug = mainPlan.slug.toLowerCase();

        const PLAN_BALANCES: Record<string, number> = {
          free_user: 500,
          basic: 500,
          pro: 1500,
          ultra: 3000,
        };

        let baseBalance = PLAN_BALANCES[slug] ?? 0;

        // --- Check for free trial abuse ---
        if (slug === "free_user") {
          const { data: existingUser } = await supabaseAdmin
            .from("user_balances")
            .select("free_trial_used, balance")
            .eq("email", email)
            .maybeSingle();

          if (existingUser?.free_trial_used) {
            console.log("⚠️ Trial already used, forcing baseBalance = 0");
            baseBalance = 0;
          }

          // Keep any remaining balance (e.g., top-ups), but don’t give free words again
          const totalBalance = (existingUser?.balance ?? 0);
          await supabaseAdmin.from("user_balances").upsert(
            {
              user_id: userId,
              email,
              plan: slug,
              balance: totalBalance, // keep existing top-ups / previous words
              updated_at: new Date().toISOString(),
              free_trial_used: true,
            },
            { onConflict: "email" }
          );
        } else {
          // For paid users: reset to base + keep any extra top-ups
          const { data: existingUser } = await supabaseAdmin
            .from("user_balances")
            .select("balance")
            .eq("email", email)
            .maybeSingle();

          const previousBalance = existingUser?.balance ?? 0;
          const topups = Math.max(previousBalance - baseBalance, 0); // detect leftover top-ups
          const newBalance = baseBalance + topups;

          await supabaseAdmin.from("user_balances").upsert(
            {
              user_id: userId,
              email,
              plan: slug,
              balance: newBalance,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );

          console.log(`✅ Balance reset: base=${baseBalance}, topups=${topups}, total=${newBalance}`);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
