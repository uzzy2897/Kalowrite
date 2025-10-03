// app/api/create-subscription-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, billing } = await req.json(); // billing = "monthly" | "yearly"

  let priceId: string | null = null;

  if (plan === "basic") {
    priceId =
      billing === "yearly"
        ? process.env.STRIPE_PRICE_BASIC_YEARLY || null
        : process.env.STRIPE_PRICE_BASIC_MONTHLY || null;
  } else if (plan === "pro") {
    priceId =
      billing === "yearly"
        ? process.env.STRIPE_PRICE_PRO_YEARLY || null
        : process.env.STRIPE_PRICE_PRO_MONTHLY || null;
  } else if (plan === "ultra") {
    priceId =
      billing === "yearly"
        ? process.env.STRIPE_PRICE_ULTRA_YEARLY || null
        : process.env.STRIPE_PRICE_ULTRA_MONTHLY || null;
  }

  if (!priceId) {
    return NextResponse.json(
      { error: "Invalid plan or billing option" },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: `${userId}@humanizer.ai`, // 🔑 replace with real email from Clerk if possible
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: { userId, plan, billing },
  });

  return NextResponse.json({ url: session.url });
}
