import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const GA4_MEASUREMENT_ID =
  process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;

if (!GA4_MEASUREMENT_ID) {
  throw new Error('GA4 measurement ID is not configured');
}

export async function POST(request: Request) {
  if (!GA4_API_SECRET) {
    return NextResponse.json(
      { error: 'GA4 API secret is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const transactionId =
      typeof body?.transactionId === 'string' && body.transactionId.length > 0
        ? body.transactionId
        : randomUUID();
    const value =
      typeof body?.value === 'number' && !Number.isNaN(body.value)
        ? body.value
        : 0;
    const currency =
      typeof body?.currency === 'string' && body.currency.length > 0
        ? body.currency
        : 'USD';
    const items = Array.isArray(body?.items) ? body.items : [];
    const userId =
      typeof body?.userId === 'string' && body.userId.length > 0
        ? body.userId
        : undefined;

    const clientId = userId || randomUUID();
    const debugMode = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true';

    const gaPayload = {
      client_id: clientId,
      ...(userId ? { user_id: userId } : {}),
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: transactionId,
            value,
            currency,
            items,
            debug_mode: debugMode,
          },
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gaPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GA4 purchase MP error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to send GA4 purchase event' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ GA4 purchase API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
