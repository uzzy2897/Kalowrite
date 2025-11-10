"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    // Load Cookiebot script first
    loadCookiebot();

    // Set up geo-targeting after Cookiebot loads
    const setupGeoTargeting = () => {
      if (typeof (window as any).Cookiebot === "undefined") {
        // Retry if Cookiebot not loaded yet
        setTimeout(setupGeoTargeting, 100);
        return;
      }

      const EU_COUNTRIES =
        "AT|BE|BG|CY|CZ|DE|DK|EE|ES|FI|FR|GB|GR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK";

      // Listen for when Cookiebot dialog is about to display
      (window as any).addEventListener("CookiebotOnDialogDisplay", function () {
        const userCountry = (window as any).Cookiebot?.userCountry?.toUpperCase() || "";
        const isEU = new RegExp(EU_COUNTRIES).test(userCountry);

        if (!isEU) {
          // Non-EU: auto-accept all cookies and hide banner
          (window as any).Cookiebot?.submitCustomConsent(true, true, true);
          setVisible(false);
        } else {
          // EU: show banner
          const consent = (window as any).Cookiebot?.consent?.preferences || false;
          if (!consent) {
            setVisible(true);
          }
        }
      });

      // Check initial consent status
      const checkConsent = () => {
        const cookiebot = (window as any).Cookiebot;
        if (cookiebot) {
          const hasConsent = cookiebot.consent?.preferences || false;
          if (hasConsent) {
            setConsent("accepted");
            setVisible(false);
            loadAllScripts();
          } else {
            // Check if user is in EU
            const userCountry = cookiebot.userCountry?.toUpperCase() || "";
            const isEU = new RegExp(EU_COUNTRIES).test(userCountry);
            if (isEU) {
              setVisible(true);
            }
          }
        } else {
          // Retry if Cookiebot not ready
          setTimeout(checkConsent, 100);
        }
      };

      checkConsent();
    };

    // Wait a bit for Cookiebot to initialize
    setTimeout(setupGeoTargeting, 500);

    // Listen for consent changes
    (window as any).addEventListener("CookiebotOnAccept", () => {
      setConsent("accepted");
      setVisible(false);
      loadAllScripts();
    });

    (window as any).addEventListener("CookiebotOnDecline", () => {
      setConsent("rejected");
      setVisible(false);
    });
  }, []);

  const handleAccept = () => {
    if ((window as any).Cookiebot) {
      (window as any).Cookiebot.submitCustomConsent(true, true, true);
    }
    setConsent("accepted");
    setVisible(false);
    loadAllScripts();
  };

  const handleManageCookies = () => {
    if ((window as any).Cookiebot) {
      (window as any).Cookiebot.show();
    }
  };

  /** ✅ Load all scripts after consent */
  const loadAllScripts = () => {
    loadGoogleAnalytics();
    loadMetaPixel();
  };

  /** ✅ Cookiebot */
  const loadCookiebot = () => {
    if (document.getElementById("Cookiebot")) return;
    const script = document.createElement("script");
    script.id = "Cookiebot";
    script.src = "https://consent.cookiebot.com/uc.js";
    script.setAttribute("data-cbid", "4c7a1203-d519-4c24-94a9-3d07ebfd5aea");
    script.setAttribute("data-blockingmode", "auto");
    script.type = "text/javascript";
    document.head.appendChild(script);
  };

  /** ✅ Google Analytics */
  const loadGoogleAnalytics = () => {
    if ((window as any).GA_INITIALIZED) return;
    (window as any).GA_INITIALIZED = true;

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }

    if (
      !document.querySelector("script[src*='googletagmanager.com/gtag/js?id=G-N337Q74SB4']")
    ) {
      const script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-N337Q74SB4";
      script.async = true;
      document.head.appendChild(script);
    }

    gtag("js", new Date());
    gtag("config", "G-N337Q74SB4", { anonymize_ip: true });
  };

  /** ✅ Meta Pixel (Facebook) — fully typed, no TS errors */
  const loadMetaPixel = () => {
    if (typeof (window as any).fbq === "function") return;

    const fbq = function (...args: any[]) {
      (fbq as any).callMethod
        ? (fbq as any).callMethod.apply(fbq, args)
        : (fbq as any).queue.push(args);
    };

    (window as any).fbq = fbq;
    (fbq as any).push = fbq;
    (fbq as any).loaded = true;
    (fbq as any).version = "2.0";
    (fbq as any).queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    (window as any).fbq("init", "1139898321406565");
    (window as any).fbq("track", "PageView");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-50">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        🍪 We use cookies to enhance your experience, improve performance, and for analytics.{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleManageCookies();
          }}
          className="text-emerald-600 hover:underline"
        >
          Manage your cookies and learn more
        </a>
        .
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
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
    fbq: (...args: any[]) => void;
    GA_INITIALIZED?: boolean;
    Cookiebot?: {
      userCountry?: string;
      consent?: {
        preferences?: boolean;
        statistics?: boolean;
        marketing?: boolean;
      };
      submitCustomConsent?: (preferences: boolean, statistics: boolean, marketing: boolean) => void;
      show?: () => void;
    };
  }
}
