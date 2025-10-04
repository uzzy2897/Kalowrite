// app/api/create-subscription-session/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, billing = "monthly" } = await req.json();

    const priceId = getPriceId(plan, billing);
    if (!priceId)
      return NextResponse.json(
        { error: "Invalid plan or billing option" },
        { status: 400 }
      );

    // Clerk email
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email)
      return NextResponse.json(
        { error: "Missing user email in Clerk profile" },
        { status: 400 }
      );

    // Get or create customer
    const { data: membership } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let stripeCustomerId = membership?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from("membership")
        .upsert({ user_id: userId, stripe_customer_id: stripeCustomerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/humanize?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: { userId, plan, billing },
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
