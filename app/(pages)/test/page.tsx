"use client";
import { useState } from "react";

export default function BuyCreditsButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ tell server it's JSON
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_100, // ✅ from .env.local
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // ✅ redirect to Stripe Checkout
      } else {
        console.error("❌ Checkout session failed:", data.error);
        alert("Something went wrong: " + data.error);
      }
    } catch (err: any) {
      console.error("❌ Fetch error:", err.message);
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      {loading ? "Redirecting..." : "Buy 100 Credits"}
    </button>
  );
}
