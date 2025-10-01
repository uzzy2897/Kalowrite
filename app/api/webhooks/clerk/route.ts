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

  // ✅ Clerk signature headers
  const h = headers() as unknown as Headers;
  const svixHeaders = {
    "svix-id": h.get("svix-id")!,
    "svix-timestamp": h.get("svix-timestamp")!,
    "svix-signature": h.get("svix-signature")!,
  };

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;
  try {
    evt = wh.verify(payload, svixHeaders) as ClerkWebhookEvent;
  } catch (err) {
    console.error("❌ Clerk webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("📩 Clerk event received:", evt.type);

  if (
    evt.type === "subscription.created" ||
    evt.type === "subscription.updated" ||
    evt.type === "subscription.canceled"
  ) {
    const sub = evt.data;
    const userId =
      sub?.user ??
      sub?.user_id ??
      sub?.payer?.user_id ??
      null;

    if (!userId) {
      console.error("⚠️ Missing user/user_id in Clerk subscription payload");
      return NextResponse.json({ error: "UserId missing" }, { status: 400 });
    }

    let planSlug: string | null = null;
    if (Array.isArray(sub.items) && sub.items.length > 0) {
      planSlug = sub.items[0]?.plan?.slug?.toLowerCase() ?? null;
    }

    if (evt.type === "subscription.canceled") {
      planSlug = "free_user";
    }

    if (planSlug) {
      const normalized = planSlug.toLowerCase();
      const newBalance =
        evt.type === "subscription.canceled"
          ? 0
          : PLAN_BALANCES[normalized] ?? 0;

      // ✅ Use set_balance RPC
      const { error } = await supabaseAdmin.rpc("set_balance", {
        uid: userId,
        amount: newBalance,
        plan_name: normalized,
      });

      if (error) {
        console.error("❌ Supabase set_balance RPC error:", error.message);
        return NextResponse.json({ error: "Balance DB error" }, { status: 500 });
      }

      console.log(
        `✅ Balance set for ${userId}: ${newBalance} (plan: ${normalized}, event: ${evt.type})`
      );
    } else {
      console.log("ℹ️ No plan slug found in Clerk subscription items; skipped balance update.");
    }
  }

  return NextResponse.json({ ok: true });
}
