"use client";

import { CircleCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type UserResponse = {
  plan?: string;
};

export default function PricingPage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  // ✅ Fetch current user plan
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        const data: UserResponse = await res.json();
        if (res.ok && data.plan) {
          setUserPlan(data.plan);
        } else {
          setUserPlan("free");
        }
      } catch (err) {
        console.error("Failed to fetch user plan", err);
        setUserPlan("free");
      } finally {
        setLoadingUser(false);
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
        body: JSON.stringify({ plan, billing }),
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
      monthlyPrice: "$9.99/mo",
      yearlyPrice: "$59.88/yr",
      features: [
        "5,000 words per month",
        "500 words per request",
        "Bypass all AI detectors",
        "Undetectable results",
        "Plagiarism free",
        "Human-like results",
        "Error-free writing",
      ],
    },
    {
      name: "Pro",
      slug: "pro",
      monthlyPrice: "$29.99/mo",
      yearlyPrice: "$179.88/yr",
      features: [
        "All Basic features",
        "Top up credits as you go",
        "1,500 words per request",
        "15,000 words per month",
      ],
    },
    {
      name: "Ultra",
      slug: "ultra",
      monthlyPrice: "$59.99/mo",
      yearlyPrice: "$359.88/yr",
      features: [
        "All Basic & Pro features",
        "Priority Support",
        "3,000 words per request",
        "30,000 words per month",
      ],
    },
  ];

  return (
    <main className="max-w-7xl mx-auto py-16 px-6 text-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground mb-10">
          Get started for free and upgrade anytime. Cancel anytime, no questions asked.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Switch to yearly and save 50%
        </p>
      </motion.div>

      {/* Billing toggle */}
      <motion.div
        className="flex justify-center mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="inline-flex items-center border rounded-full bg-accent overflow-hidden">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              billing === "monthly"
                ? "bg-emerald-600 text-white rounded-full"
                : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              billing === "yearly"
                ? "bg-emerald-600 text-white rounded-full"
                : "text-muted-foreground"
            }`}
          >
            Yearly
          </button>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <motion.div
        className="grid gap-8 md:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        {plans.map((plan) => {
          const isCurrent = userPlan === plan.slug;
          const priceText =
            billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

          return (
            <motion.div
              key={plan.slug}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -6, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
              className={`border rounded-2xl p-8 bg-card flex flex-col relative ${
                plan.slug === "pro" ? "border-emerald-500" : "border-muted"
              }`}
            >
              {/* Plan Name + Tag */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.slug === "pro" && (
                  <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </div>

              {/* Price */}
              <p className="text-4xl font-medium text-start mb-6">{priceText}</p>

              {/* Features */}
              <ul className="mb-8 space-y-3 text-left">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <CircleCheck className="h-5 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>

              {/* Button */}
              {loadingUser ? (
                <div className="mt-auto h-12 bg-muted animate-pulse rounded-md" />
              ) : isCurrent ? (
                <button
                  disabled
                  className="mt-auto px-6 py-3 bg-accent text-muted-foreground rounded-md border cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.slug)}
                  disabled={loadingPlan === plan.slug}
                  className="mt-auto px-6 py-3 bg-primary text-black rounded-md hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loadingPlan === plan.slug
                    ? "Redirecting..."
                    : userPlan === "free"
                    ? "Subscribe"
                    : `Switch to ${plan.name}`}
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </main>
  );
}
