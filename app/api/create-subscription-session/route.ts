// app/api/create-subscription-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, billing } = await req.json(); // billing = "monthly" | "yearly"

  // ✅ 1️⃣ Determine Stripe price ID
  const priceId =
    plan === "basic"
      ? billing === "yearly"
        ? process.env.STRIPE_PRICE_BASIC_YEARLY
        : process.env.STRIPE_PRICE_BASIC_MONTHLY
      : plan === "pro"
      ? billing === "yearly"
        ? process.env.STRIPE_PRICE_PRO_YEARLY
        : process.env.STRIPE_PRICE_PRO_MONTHLY
      : plan === "ultra"
      ? billing === "yearly"
        ? process.env.STRIPE_PRICE_ULTRA_YEARLY
        : process.env.STRIPE_PRICE_ULTRA_MONTHLY
      : null;

  if (!priceId) {
    return NextResponse.json(
      { error: "Invalid plan or billing option" },
      { status: 400 }
    );
  }

  // ✅ 2️⃣ Get user email from Clerk
  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json(
      { error: "Missing email in Clerk profile" },
      { status: 400 }
    );
  }

  // ✅ 3️⃣ Check if Stripe customer already exists in Supabase
  const { data: membership } = await supabaseAdmin
    .from("membership")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let stripeCustomerId = membership?.stripe_customer_id;

  // ✅ 4️⃣ Create customer if needed
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;

    // Save it immediately for reuse
    await supabaseAdmin
      .from("membership")
      .upsert({ user_id: userId, stripe_customer_id: stripeCustomerId });
  }

  // ✅ 5️⃣ Create checkout session linked to that customer
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/humanize?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: { userId, plan, billing },
  });

  return NextResponse.json({ url: session.url });
}
