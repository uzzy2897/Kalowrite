'use client';

import { useEffect, useState } from 'react';

// EU/EEA country codes (27 EU countries + UK, Norway, Iceland, Liechtenstein)
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

async function checkIfInEurope(): Promise<boolean> {
  try {
    // Use server-side geo-detection API
    const response = await fetch('/api/geo', {
      cache: 'no-store', // Always get fresh geo data
    });
    const data = await response.json();

    if (data.isEU !== undefined) {
      console.log('🌍 Geo-detection (API):', data);
      return data.isEU;
    }
  } catch (error) {
    console.warn('⚠️ Geo-detection API failed:', error);
  }

  // Fallback: Check Cookiebot's userCountry
  if (typeof window !== 'undefined' && (window as any).Cookiebot?.userCountry) {
    const country = (window as any).Cookiebot.userCountry;
    const isEU = EU_COUNTRIES.includes(country.toUpperCase());
    console.log('🌍 Geo-detection (Cookiebot fallback):', { country, isEU });
    return isEU;
  }

  // Default: assume not EU (will auto-accept)
  console.log('🌍 Geo-detection: Defaulting to non-EU (auto-accept)');
  return false;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<string | null>(null);
  const [isEU, setIsEU] = useState<boolean | null>(null);

  useEffect(() => {
    const checkGeoAndConsent = async () => {
      // Check if user is in Europe using API
      const inEurope = await checkIfInEurope();
      setIsEU(inEurope);

      if (inEurope) {
        loadCookiebot();
      }

      const saved = localStorage.getItem('cookie_consent');

      if (!saved) {
        setVisible(true); // Always show the general banner until consent is given
        return;
      }

      setConsent(saved);
      if (saved === 'accepted') {
        loadAllScripts();
      } else {
        setVisible(true);
      }
    };

    // Check geo and handle consent
    void checkGeoAndConsent();
  }, []);

  const handleConsent = (value: 'accepted' | 'rejected') => {
    localStorage.setItem('cookie_consent', value);
    setConsent(value);
    setVisible(false);
    if (value === 'accepted') {
      // Also submit to Cookiebot if available
      if ((window as any).Cookiebot) {
        (window as any).Cookiebot.submitCustomConsent(true, true, true);
      }
      loadAllScripts();
    }
  };

  /** ✅ Load all scripts after consent */
  const loadAllScripts = () => {
    loadGoogleAnalytics();
    loadMetaPixel();
  };

  /** ✅ Cookiebot */
  const loadCookiebot = () => {
    if (document.getElementById('Cookiebot')) return;
    const script = document.createElement('script');
    script.id = 'Cookiebot';
    script.src = 'https://consent.cookiebot.com/uc.js';
    script.setAttribute('data-cbid', '4c7a1203-d519-4c24-94a9-3d07ebfd5aea');
    script.setAttribute('data-blockingmode', 'auto');
    script.setAttribute('data-culture', 'EN');
    script.type = 'text/javascript';
    script.async = true;
    document.head.appendChild(script);
  };

  /** ✅ Google Analytics */
  const loadGoogleAnalytics = () => {
    if ((window as any).GA_INITIALIZED) return;
    (window as any).GA_INITIALIZED = true;

    (window as any).dataLayer = (window as any).dataLayer || [];

    // Define gtag function and attach to window
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }

    // Make gtag available globally
    (window as any).gtag = gtag;

    if (
      !document.querySelector(
        "script[src*='googletagmanager.com/gtag/js?id=G-N337Q74SB4']"
      )
    ) {
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-N337Q74SB4';
      script.async = true;
      document.head.appendChild(script);
    }

    gtag('js', new Date());
    gtag('config', 'G-N337Q74SB4', { anonymize_ip: true });
  };

  /** ✅ Meta Pixel (Facebook) — fully typed, no TS errors */
  const loadMetaPixel = () => {
    if (typeof (window as any).fbq === 'function') return;

    const fbq = function (...args: any[]) {
      (fbq as any).callMethod
        ? (fbq as any).callMethod.apply(fbq, args)
        : (fbq as any).queue.push(args);
    };

    (window as any).fbq = fbq;
    (fbq as any).push = fbq;
    (fbq as any).loaded = true;
    (fbq as any).version = '2.0';
    (fbq as any).queue = [];

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    (window as any).fbq('init', '1139898321406565');
    (window as any).fbq('track', 'PageView');
  };

  if (!visible) return null;

  return (
    <div className='fixed bottom-4 inset-x-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-50'>
      <p className='text-sm text-gray-700 dark:text-gray-300'>
        🍪 We use cookies to enhance your experience, improve performance, and
        for analytics.{' '}
        <a href='/privacy' className='text-emerald-600 hover:underline'>
          Manage your cookies and learn more
        </a>
        .
      </p>
      <div className='flex gap-2'>
        <button
          onClick={() => handleConsent('accepted')}
          className='px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition'
        >
          Accept
        </button>
      </div>
    </div>
  );
}

/* ✅ TypeScript global declarations */
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    GA_INITIALIZED?: boolean;
    Cookiebot?: {
      userCountry?: string;
      consent?: {
        preferences?: boolean;
        statistics?: boolean;
        marketing?: boolean;
      };
      submitCustomConsent?: (
        preferences: boolean,
        statistics: boolean,
        marketing: boolean
      ) => void;
      show?: () => void;
      renew?: () => void;
      openDialog?: () => void;
    };
  }
}
