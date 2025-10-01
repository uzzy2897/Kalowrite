// app/api/create-checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { currentUser } from "@clerk/nextjs/server"; // ✅ use currentUser instead of auth()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil", // ✅ matches your installed Stripe SDK
});

export async function POST(req: Request) {
  // ✅ Fetch the logged-in Clerk user
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { priceId } = (await req.json()) as { priceId: string };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // ✅ one-time product
      line_items: [
        {
          price: priceId, // e.g. "price_xxx" from Stripe Test Mode
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?canceled=1`,
      metadata: {
        userId: user.id,        // ✅ Clerk user ID
        email: user.emailAddresses[0]?.emailAddress || "", // optional
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
