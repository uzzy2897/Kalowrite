import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const GA4_MEASUREMENT_ID =
  process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;

const GOOGLE_ADS_CONVERSION_ID =
  process.env.GOOGLE_ADS_CONVERSION_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

const GOOGLE_ADS_SIGNUP_LABEL =
  process.env.GOOGLE_ADS_SIGNUP_LABEL ||
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL;

const GOOGLE_ADS_SIGNUP_ENABLED =
  Boolean(GOOGLE_ADS_CONVERSION_ID) && Boolean(GOOGLE_ADS_SIGNUP_LABEL);

if (!GA4_MEASUREMENT_ID) {
  throw new Error('GA4 measurement ID is not configured');
}

async function sendGoogleAdsSignupConversion() {
  if (!GOOGLE_ADS_SIGNUP_ENABLED) {
    console.warn(
      '⚠️ Google Ads sign-up conversion skipped (missing ID or label env vars)'
    );
    return;
  }

  const url = new URL(
    `https://www.googleadservices.com/pagead/conversion/${GOOGLE_ADS_CONVERSION_ID}/`
  );
  url.searchParams.set('label', GOOGLE_ADS_SIGNUP_LABEL as string);
  url.searchParams.set('guid', 'ON');
  url.searchParams.set('script', '0');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'KalowriteServer/1.0',
      },
    });

    console.log(
      '🚀 Google Ads sign-up conversion sent:',
      response.ok,
      response.status,
      url.toString()
    );
    if (!response.ok) {
      console.warn(
        '⚠️ Google Ads sign-up conversion failed',
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.warn('⚠️ Google Ads sign-up conversion threw', error);
  }
}

export async function POST(request: Request) {
  if (!GA4_API_SECRET) {
    console.warn('⚠️ GA4_API_SECRET missing – /api/ga/sign-up disabled');
    return NextResponse.json(
      { error: 'GA4 API secret is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    console.log('📥 GA sign-up payload received:', body);
    const method = typeof body?.method === 'string' ? body.method : 'email';
    const userId =
      typeof body?.userId === 'string' && body.userId.length > 0
        ? body.userId
        : undefined;

    const clientId = userId || randomUUID();
    const eventId = randomUUID();
    const debugMode = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true';

    console.log('🚀 ~ POST ~ clientId:', clientId);
    const gaPayload = {
      client_id: clientId,
      events: [
        {
          name: 'sign_up',
          params: {
            method,
            user_id: userId,
            event_id: eventId,
            debug_mode: debugMode,
          },
        },
      ],
    };

    const gaResponse = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gaPayload),
      }
    );

    if (!gaResponse.ok) {
      const errorText = await gaResponse.text();
      console.error('❌ GA4 sign_up MP error:', gaResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to send GA4 sign_up event' },
        { status: 502 }
      );
    }
    const json = gaResponse.status;
    console.log('🚀 ~ POST ~ gaResponse:', json);

    await sendGoogleAdsSignupConversion();

    console.log('✅ GA4 sign_up event sent (server)');
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ GA4 sign_up API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
