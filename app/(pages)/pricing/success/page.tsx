"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trackPurchaseGA } from "@/lib/ga/trackPurchase";

export default function PurchaseSuccessPage() {
  useEffect(() => {
    const trackPurchase = async () => {
      try {
        const sessionId = new URLSearchParams(window.location.search).get("session_id");
        if (!sessionId) {
          console.warn("⚠️ Missing session_id in success URL");
          return;
        }

        const res = await fetch(
          `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`
        );

        if (!res.ok) {
          console.error("⚠️ Failed to load Stripe session", res.statusText);
          return;
        }

        const session = await res.json();

        if (!session || !session.amount_total) {
          console.warn("⚠️ Stripe session payload incomplete", session);
          return;
        }

        const value = session.amount_total / 100;
        const currency = session.currency?.toUpperCase();
        const eventId = session.id;

        /* ---------------- Facebook Pixel + CAPI ---------------- */
        const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];
        const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];

        if (window.fbq) {
          window.fbq(
            "track",
            "Purchase",
            { value, currency },
            { eventID: eventId }
          );
        }

        await fetch("/api/facebook-capi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            email: session.customer_details?.email,
            value,
            currency,
            url: window.location.href,
            fbp,
            fbc,
          }),
        });

        /* ---------------- Google Analytics ---------------- */
        const itemId =
          session.metadata?.product_id ||
          session.metadata?.plan ||
          session.metadata?.billing ||
          "subscription";
        const itemName =
          session.metadata?.product_name ||
          (session.metadata?.plan
            ? `${session.metadata.plan}${
                session.metadata?.billing ? `_${session.metadata.billing}` : ""
              }`
            : "Subscription");

        const items = [
          {
            item_id: itemId,
            item_name: itemName,
            price: value,
            quantity: 1,
          },
        ];

        trackPurchaseGA({
          transactionId: eventId,
          value,
          currency,
          items,
        });

        fetch('/api/ga/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: eventId,
            value,
            currency,
            items,
            userId: session.metadata?.userId,
          }),
        }).catch((err) =>
          console.warn('⚠️ Failed to send GA4 purchase via server:', err)
        );

        console.log("✅ Purchase tracked (FB + GA)");
      } catch (err) {
        console.error("⚠️ Purchase tracking failed:", err);
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
