"use client";

import { useState, useEffect } from "react";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly"); // ✅ Toggle state

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
        body: JSON.stringify({ plan, billing }), // pass billing mode too
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
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
      slug: "basic",
      monthlyPrice: "$9.99/month",
      yearlyPrice: "$59.88/year (just $4.99/mo billed annually)",
      words: "5,000 words per month",
      perRequest: "500 words per request",
      features: [
        "Bypass all AI detectors (incl. Turnitin & GPTZero)",
        "Undetectable results",
        "Plagiarism free",
        "Human-like results",
        "Error-free writing",
      ],
    },
    {
      name: "Pro (Most Popular)",
      slug: "pro",
      monthlyPrice: "$29.99/month",
      yearlyPrice: "$179.88/year (just $14.99/mo billed annually)",
      words: "15,000 words per month",
      perRequest: "1,500 words per request",
      features: ["All Basic features", "Top up more credits as you go"],
    },
    {
      name: "Ultra",
      slug: "ultra",
      monthlyPrice: "$59.99/month",
      yearlyPrice: "$359.88/year (just $29.99/mo billed annually)",
      words: "30,000 words per month",
      perRequest: "3,000 words per request",
      features: ["All Basic & Pro features", "Priority Support"],
    },
  ];

  return (
    <main className="max-w-6xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold text-center mb-6">💳 Pricing Plans</h1>

      {/* ✅ Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 text-sm font-medium ${
              billing === "monthly" ? "bg-emerald-600 text-white" : "bg-card text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-4 py-2 text-sm font-medium ${
              billing === "yearly" ? "bg-emerald-600 text-white" : "bg-card text-muted-foreground"
            }`}
          >
            Yearly <span className="ml-1 text-xs text-emerald-400">(Save 50%)</span>
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = userPlan === plan.slug;
          const priceText =
            billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

          return (
            <div
              key={plan.slug}
              className="border rounded-xl p-6 shadow-md bg-card flex flex-col relative"
            >
              {plan.slug === "pro" && (
                <span className="absolute top-0 right-0 bg-emerald-600 text-white text-xs px-2 py-1 rounded-bl-md">
                  Most Popular
                </span>
              )}

              <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
              <p className="text-lg font-bold mb-2">{priceText}</p>

              <p className="text-sm font-medium mb-1">{plan.words}</p>
              <p className="text-sm mb-4">{plan.perRequest}</p>

              <ul className="mb-6 space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i}>✅ {f}</li>
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
