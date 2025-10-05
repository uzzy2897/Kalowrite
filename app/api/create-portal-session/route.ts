// app/api/create-portal-session/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 🔑 Look up the Stripe customer ID from your DB
  const { data, error } = await supabaseAdmin
    .from("membership")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (error || !data?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  // 🎟 Create the portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`, // where Stripe sends them back
  });

  return NextResponse.json({ url: session.url });
}
