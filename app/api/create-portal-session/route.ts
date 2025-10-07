// app/api/create-portal-session/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST() {
  try {
    // 🧭 Clerk authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🗄️ Fetch Stripe customer from Supabase
    const { data: membership, error } = await supabaseAdmin
      .from("membership")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (error || !membership?.stripe_customer_id) {
      console.error("❌ No Stripe customer found for user:", userId, error);
      return NextResponse.json(
        { error: "Stripe customer not found" },
        { status: 404 }
      );
    }

    // 🧾 Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    if (!session.url) {
      console.error("❌ Failed to create billing portal session for:", userId);
      return NextResponse.json(
        { error: "Unable to create portal session" },
        { status: 500 }
      );
    }

    // ✅ Success — return redirect URL
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("💥 Stripe portal session error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
