'use client';

const DEFAULT_GA_MEASUREMENT_ID = 'G-N337Q74SB4';
const ENV_GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const GA_MEASUREMENT_ID = ENV_GA_ID || DEFAULT_GA_MEASUREMENT_ID;
const IS_USING_FALLBACK_GA_ID = !ENV_GA_ID;

const DEFAULT_GOOGLE_ADS_ID = 'AW-17683674158';
const ENV_GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_ADS_ID = ENV_GOOGLE_ADS_ID || DEFAULT_GOOGLE_ADS_ID;

let warnedAboutMissingGaId = false;
let warnedAboutGaIdFallback = false;

const GTAG_SCRIPT_SELECTOR = (id: string) =>
  `script[src*='googletagmanager.com/gtag/js?id=${id}']`;

function bootstrapGtag(id: string) {
  if (typeof window === 'undefined') return false;

  if (!id) {
    if (!warnedAboutMissingGaId) {
      console.warn(
        '⚠️ Google Analytics measurement ID missing - set NEXT_PUBLIC_GA_MEASUREMENT_ID.'
      );
      warnedAboutMissingGaId = true;
    }
    return false;
  }

  if (IS_USING_FALLBACK_GA_ID && !warnedAboutGaIdFallback) {
    console.warn(
      `⚠️ NEXT_PUBLIC_GA_MEASUREMENT_ID not set. Falling back to ${DEFAULT_GA_MEASUREMENT_ID}.`
    );
    warnedAboutGaIdFallback = true;
  }

  if ((window as any).GA_INITIALIZED) return true;

  (window as any).dataLayer = (window as any).dataLayer || [];

  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }

  (window as any).gtag = gtag;

  if (!document.querySelector(GTAG_SCRIPT_SELECTOR(id))) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.async = true;
    document.head.appendChild(script);
  }

  gtag('js', new Date());
  // gtag('config', id, { anonymize_ip: true });
  gtag('consent', 'update', {
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 0,
  });

  // ensure config is set in debug mode (safe to call again)
  gtag('config', 'G-N337Q74SB4', { send_page_view: false });
  if (GOOGLE_ADS_ID) {
    gtag('config', GOOGLE_ADS_ID, { send_page_view: false });
  }

  // send a visible debug event
  // gtag('event', 'page_view', {
  //   page_location: location.href,
  //   page_path: location.pathname + location.search,
  //   page_title: document.title,
  //   debug_mode: true,
  // });

  (window as any).GA_INITIALIZED = true;

  return true;
}

export function ensureGaInitialized() {
  return bootstrapGtag(GA_MEASUREMENT_ID);
}

export function isUsingFallbackGaId() {
  return IS_USING_FALLBACK_GA_ID;
}

export { GA_MEASUREMENT_ID };
