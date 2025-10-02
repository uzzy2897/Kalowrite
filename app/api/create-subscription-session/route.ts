// app/api/create-subscription-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });

export async function POST(req: Request) {
  const { userId } = await auth(); // ✅ must await here
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  const priceId =
    plan === "basic"
      ? process.env.STRIPE_PRICE_BASIC
      : plan === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : plan === "ultra"
      ? process.env.STRIPE_PRICE_ULTRA
      : null;

  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: `${userId}@humanizer.ai`, // Or fetch user email from Clerk
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
