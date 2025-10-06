"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cookie_consent");
    if (!saved) setVisible(true);
    else {
      setConsent(saved);
      if (saved === "accepted") loadAllScripts();
    }
  }, []);

  const handleConsent = (value: "accepted" | "rejected") => {
    localStorage.setItem("cookie_consent", value);
    setConsent(value);
    setVisible(false);
    if (value === "accepted") loadAllScripts();
  };

  /** ✅ Load all scripts after consent */
  const loadAllScripts = () => {
    loadCookiebot();
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
        <a href="/privacy" className="text-emerald-600 hover:underline">
          Learn more
        </a>
        .
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => handleConsent("rejected")}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
        >
          Reject
        </button>
        <button
          onClick={() => handleConsent("accepted")}
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
  }
}
