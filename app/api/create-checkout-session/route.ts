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

    // 2) Parse body for words (slider input)
    const { words } = (await req.json()) as { words: number };
    if (!words || words < 1000) {
      return NextResponse.json(
        { error: "Invalid words amount (minimum 1000)" },
        { status: 400 }
      );
    }

    // 3) Calculate total price: $2 per 1000 words
    const pricePer1000 = 200; // cents ($2)
    const amount = Math.round((words / 1000) * pricePer1000);

    console.log("🟢 Creating checkout session:", {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      words,
      amount,
    });

    // 4) Create Stripe Checkout Session with custom amount
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // ✅ one-time payment
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Word Top-Up",
              description: `${words.toLocaleString()} words`,
            },
            unit_amount: amount, // total in cents
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?canceled=1`,

      // ✅ store metadata for webhook processing
      metadata: {
        userId: user.id, // Clerk user ID
        email: user.emailAddresses[0]?.emailAddress || "",
        words: words.toString(),
      },
    });

    // 5) Respond with checkout URL
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe Checkout error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
