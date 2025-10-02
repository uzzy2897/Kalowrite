"use client";

import { useState, useEffect } from "react";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");

  // ✅ Fetch current user plan
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        const data = await res.json();
        if (res.ok) {
          setUserPlan(data.plan || "free");
        }
      } catch (err) {
        console.error("Failed to fetch user plan", err);
      }
    };
    fetchUser();
  }, []);

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
      name: "Basic",
      price: "$5 / month",
      words: "500 words per month",
      features: ["✅ Monthly refill", "✅ Access to AI Humanizer"],
      slug: "basic",
    },
    {
      name: "Pro",
      price: "$15 / month",
      words: "1,500 words per month",
      features: ["✅ Higher monthly refill", "✅ Priority processing"],
      slug: "pro",
    },
    {
      name: "Ultra",
      price: "$30 / month",
      words: "3,000 words per month",
      features: ["✅ Large monthly refill", "✅ Priority + Premium Support"],
      slug: "ultra",
    },
  ];

  return (
    <main className="max-w-5xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold text-center mb-10">💳 Pricing Plans</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = userPlan === plan.slug;

          return (
            <div
              key={plan.slug}
              className="border rounded-xl p-6 shadow-md bg-card flex flex-col"
            >
              <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
              <p className="text-3xl font-bold mb-2">{plan.price}</p>
              <p className="text-gray-600 mb-4">{plan.words}</p>
              <ul className="mb-6 space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="mt-auto px-4 py-2 text-muted-foreground rounded-md cursor-not-allowed"
                >
                  ✅ Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.slug)}
                  disabled={loadingPlan === plan.slug}
                  className="mt-auto px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loadingPlan === plan.slug
                    ? "Redirecting..."
                    : userPlan === "free"
                    ? "Subscribe"
                    : `Switch to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
