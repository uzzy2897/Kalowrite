import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details'],
    });

    return NextResponse.json({
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
      customer_details: {
        email: session.customer_details?.email ?? null,
      },
      payment_status: session.payment_status,
      mode: session.mode,
      created: session.created,
    });
  } catch (error: any) {
    console.error('❌ Failed to retrieve Stripe session:', error);
    const statusCode = error?.statusCode ?? 500;
    return NextResponse.json(
      { error: error?.message ?? 'Unable to fetch session' },
      { status: statusCode }
    );
  }
}
