// app/api/create-subscription-session/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPriceId } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(req: Request) {
  try {
    // ✅ Get authenticated Clerk user
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email)
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    // ✅ Parse body
    const { plan, billing = 'monthly' } = await req.json();
    const priceId = getPriceId(plan, billing);
    if (!priceId)
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    // ✅ Fetch or create customer
    const { data: membership } = await supabaseAdmin
      .from('membership')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let stripeCustomerId = membership?.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from('membership')
        .upsert(
          { user_id: userId, stripe_customer_id: stripeCustomerId },
          { onConflict: 'user_id' }
        );
    }

    // ✅ Get base URL (from env or request headers)
    const getBaseUrl = () => {
      // Try environment variable first
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
      }
      // Fallback: construct from request headers
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      return `${protocol}://${host}`;
    };

    const baseUrl = getBaseUrl();

    // ✅ Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId, plan, billing }, // ✅ stored on subscription
      },
      metadata: { userId, plan, billing },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/pricing/success?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('❌ create-subscription-session error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
