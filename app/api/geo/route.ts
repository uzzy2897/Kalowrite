// app/api/geo/route.ts
// Server-side geo-detection using request headers
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// EU/EEA country codes
const EU_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'GB',
  'NO',
  'IS',
  'LI', // UK, Norway, Iceland, Liechtenstein
];

export async function GET() {
  try {
    const headersList = await headers();

    // Vercel provides x-vercel-ip-country header
    const country =
      headersList.get('x-vercel-ip-country') ||
      headersList.get('cf-ipcountry') || // Cloudflare
      headersList.get('x-country-code') || // Other providers
      null;

    if (!country) {
      // If no country detected, default to non-EU (auto-accept)
      return NextResponse.json({
        country: null,
        isEU: false,
        source: 'default',
      });
    }

    const countryUpper = country.toUpperCase();
    const isEU = EU_COUNTRIES.includes(countryUpper);

    return NextResponse.json({
      country: countryUpper,
      isEU,
      source: 'header',
    });
  } catch (error) {
    console.error('❌ Geo-detection error:', error);
    // Default to non-EU on error (auto-accept)
    return NextResponse.json({
      country: null,
      isEU: false,
      source: 'error',
    });
  }
}
