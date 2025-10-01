"use client";

import { useState } from "react";

interface Props {
  priceId: string;
  label: string;
}

export default function BuyCreditsButton({ priceId, label }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // redirect to Stripe Checkout
    } else {
      alert("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-emerald-500 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}
