"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PurchaseSuccessPage() {
  useEffect(() => {
    const trackPurchase = async () => {
      try {
        // ✅ Example: retrieve session data from query params or your backend
        const sessionId = new URLSearchParams(window.location.search).get("session_id");

        if (!sessionId) return;

        // Optionally, fetch from your backend
        const res = await fetch(`/api/stripe/session?session_id=${sessionId}`);
        const session = await res.json();

        const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];
        const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];

        const eventId = session.id;
        if (window.fbq) {
          window.fbq("track", "Purchase", {
            value: session.amount_total / 100,
            currency: session.currency?.toUpperCase(),
          }, { eventID: eventId });
        }

        await fetch("/api/fb/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            email: session.customer_details?.email,
            value: session.amount_total / 100,
            currency: session.currency?.toUpperCase(),
            url: window.location.href,
            fbp,
            fbc,
          }),
        });

        console.log("✅ Purchase tracked (browser + CAPI)");
      } catch (err) {
        console.error("⚠️ Facebook client tracking failed:", err);
      }
    };

    trackPurchase();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center px-4">
      <h1 className="text-2xl font-semibold mb-2">Payment Successful 🎉</h1>
      <p className="text-zinc-400 max-w-md">Thank you for your purchase!</p>
      <Link
        href="/humanize"
        className="bg-accent/50 hover:scale-95 font-bold hover:bg-emerald-500 transition ease py-3 px-4 mt-4 rounded border"
      >
        Start Humanizing
      </Link>
    </div>
  );
}
