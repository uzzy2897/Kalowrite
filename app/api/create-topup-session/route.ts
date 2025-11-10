// app/api/create-topup-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { words } = await req.json(); // e.g., 1000 → 30,000
  if (words < 1000 || words > 30000) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const amountUsd = (words / 1000) * 200; // $2 per 1000 words (in cents)

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: `${userId}@humanizer.ai`,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `${words} words top-up` },
          unit_amount: amountUsd,
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/humanize?topup=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/humanize?topup=canceled`,
    metadata: { userId, words },
  });

  return NextResponse.json({ url: session.url });
}
