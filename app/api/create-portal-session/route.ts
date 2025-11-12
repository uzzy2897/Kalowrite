// app/api/create-portal-session/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔑 Fetch Stripe customer from Supabase
    const { data, error } = await supabaseAdmin
      .from('membership')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no record gracefully

    if (error) {
      console.error('❌ Database error fetching membership:', error);
      return NextResponse.json(
        { error: 'Failed to fetch membership data' },
        { status: 500 }
      );
    }

    if (!data?.stripe_customer_id) {
      console.error('❌ No Stripe customer found for user:', userId);
      return NextResponse.json(
        {
          error:
            'No active subscription found. Please subscribe to a plan first.',
        },
        { status: 404 }
      );
    }

    // 🎟 Create a customer portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          'https://kalowrite.com'
        }/pricing`,
      });

      return NextResponse.json({ url: session.url });
    } catch (stripeError: any) {
      console.error('❌ Stripe portal session creation error:', stripeError);
      return NextResponse.json(
        {
          error:
            stripeError.message ||
            'Failed to create portal session. Please try again later.',
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('❌ create-portal-session error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
