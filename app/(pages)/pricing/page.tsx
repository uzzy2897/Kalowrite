"use client";

import { useState } from "react";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    setLoadingPlan(plan);

    try {
      const res = await fetch("/api/create-subscription-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe checkout
      } else {
        alert("Something went wrong: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout.");
    }

    setLoadingPlan(null);
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      words: "500 words total",
      features: ["✅ One-time free credits", "✅ Access to AI Humanizer"],
      button: { text: "Get Started", disabled: true },
    },
    {
      name: "Basic",
      price: "$5 / month",
      words: "500 words per month",
      features: ["✅ Monthly refill", "✅ Access to AI Humanizer"],
      button: { text: "Subscribe", plan: "basic" },
    },
    {
      name: "Pro",
      price: "$15 / month",
      words: "1,500 words per month",
      features: ["✅ Higher monthly refill", "✅ Priority processing"],
      button: { text: "Subscribe", plan: "pro" },
    },
    {
      name: "Ultra",
      price: "$30 / month",
      words: "3,000 words per month",
      features: ["✅ Large monthly refill", "✅ Priority + Premium Support"],
      button: { text: "Subscribe", plan: "ultra" },
    },
  ];

  return (
    <main className="max-w-5xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold text-center mb-10">💳 Pricing Plans</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="border rounded-xl p-6 shadow-md bg-white flex flex-col"
          >
            <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
            <p className="text-3xl font-bold mb-2">{plan.price}</p>
            <p className="text-gray-600 mb-4">{plan.words}</p>
            <ul className="mb-6 space-y-2 text-sm">
              {plan.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            {plan.button.disabled ? (
              <button
                disabled
                className="mt-auto px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
              >
                {plan.button.text}
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe(plan.button.plan!)}
                disabled={loadingPlan === plan.button.plan}
                className="mt-auto px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingPlan === plan.button.plan
                  ? "Redirecting..."
                  : plan.button.text}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
