// app/api/create-subscription-session/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    // 🧭 Clerk Auth
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email)
      return NextResponse.json({ error: "Missing email address" }, { status: 400 });

    // 🧾 Parse request body
    const { plan, billing = "monthly" } = await req.json();
    const priceId = getPriceId(plan, billing);
    if (!priceId)
      return NextResponse.json({ error: "Invalid plan or billing" }, { status: 400 });

    // 🗄️ Fetch or create Stripe customer
    const { data: membership } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let stripeCustomerId = membership?.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        name: user.fullName || undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from("membership")
        .upsert(
          { user_id: userId, stripe_customer_id: stripeCustomerId },
          { onConflict: "user_id" }
        );
    }

    // ✅ Create Checkout session (first subscription only)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId, plan, billing },
      },
      metadata: { userId, plan, billing },
      success_url: `${appUrl}/humanize?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ create-subscription-session error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
