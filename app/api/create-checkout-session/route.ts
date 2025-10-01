// app/api/create-checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { currentUser } from "@clerk/nextjs/server"; // ✅ Clerk server-side API

// ✅ Stripe initialized with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil", // matches your installed Stripe SDK
});

export async function POST(req: Request) {
  try {
    // 1) Fetch the logged-in Clerk user
    const user = await currentUser();

    if (!user) {
      console.error("❌ Not authenticated: No Clerk user found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Parse body for priceId
    const { priceId } = (await req.json()) as { priceId: string };
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    console.log("🟢 Creating checkout session:", {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      priceId,
    });

    // 3) Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // ✅ one-time payment
      line_items: [
        {
          price: priceId, // ex: "price_12345" from Stripe Dashboard
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?canceled=1`,
      metadata: {
        userId: user.id, // ✅ Clerk user ID
        email: user.emailAddresses[0]?.emailAddress || "",
      },
    });

    // 4) Respond with checkout URL
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe Checkout error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
