"use client";

import { useState } from "react";

// ✅ Consistent formatter (no hydration issues)
const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US").format(num);

export default function BuyWordsPage() {
  const [words, setWords] = useState(1000);
  const [loading, setLoading] = useState(false);

  // $2 per 1000 words
  const price = ((words / 1000) * 2).toFixed(2);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(`❌ Error: ${error}`);
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong, please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-6">Buy Extra Words</h1>

      {/* Slider */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Select Words: {formatNumber(words)}
        </label>
        <input
          type="range"
          min={1000}
          max={30000}
          step={500}
          value={words}
          onChange={(e) => setWords(parseInt(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </div>

      {/* Summary */}
      <div className="mb-6 p-4 border rounded-lg bg-card">
        <p className="text-lg">
          <span className="font-semibold">{formatNumber(words)}</span> words
        </p>
        <p className="text-lg">
          Price: <span className="font-semibold">${price}</span>
        </p>
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-lg font-medium shadow-md disabled:opacity-50"
      >
        {loading ? "Redirecting..." : `Buy for $${price}`}
      </button>
    </main>
  );
}
