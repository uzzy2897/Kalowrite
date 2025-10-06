"use client";

import { CircleCheck, Loader2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";

type Membership = {
  plan?: string;
  billing_interval?: "monthly" | "yearly";
  scheduled_plan?: string | null;
  scheduled_plan_effective_at?: string | null;
};

export default function PricingPage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { isSignedIn } = useAuth();

  const currentPlan = membership?.plan ?? "free";
  const currentBilling = membership?.billing_interval ?? "monthly";
  const scheduledPlan = membership?.scheduled_plan ?? null;
  const planOrder = ["free", "basic", "pro", "ultra"];

  // ✅ Auto-clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  // ✅ Fetch current membership from Supabase
  useEffect(() => {
    const fetchMembership = async () => {
      try {
        const res = await fetch("/api/membership");
        const data = await res.json();
        if (res.ok) setMembership(data);
        else setMembership({ plan: "free" });
      } catch {
        setMembership({ plan: "free" });
      } finally {
        setLoadingUser(false);
      }
    };
    fetchMembership();
  }, []);

  // ✅ Upgrade via Stripe Checkout
  const handleUpgrade = async (plan: string) => {
    setMessage(null);
    setLoadingPlan(plan);

    if (!isSignedIn) {
      window.location.href = `/auth/sign-in?redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }

    try {
      const res = await fetch("/api/create-subscription-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMessage({ type: "error", text: data.error || "Checkout failed." });
    } catch {
      setMessage({ type: "error", text: "Failed to start checkout." });
    }
    setLoadingPlan(null);
  };

  // ✅ Downgrade = Manage plan in Stripe Portal
  const handleDowngrade = async () => {
    setMessage(null);
    setLoadingPlan("portal");

    if (!isSignedIn) {
      window.location.href = `/auth/sign-in?redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }

    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // 🚀 Redirect to Stripe Customer Portal
      } else {
        setMessage({ type: "error", text: data.error || "Failed to open portal." });
      }
    } catch {
      setMessage({ type: "error", text: "Error creating portal session." });
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground mb-10">
          Get started for free and upgrade anytime. Cancel anytime, no questions asked.
        </p>
        <p className="text-sm text-muted-foreground mb-3">Switch to yearly and save 50%</p>
      </motion.div>

      {/* Inline Alert */}
      {message && (
        <div
          className={`mb-8 mx-auto max-w-md flex items-center gap-3 p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? <CircleCheck className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center border rounded-full bg-accent overflow-hidden">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              billing === "monthly" ? "bg-emerald-600 text-white rounded-full" : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              billing === "yearly" ? "bg-emerald-600 text-white rounded-full" : "text-muted-foreground"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

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
          const isCurrent = currentPlan === plan.slug && currentBilling === billing;
          const isScheduled = scheduledPlan === plan.slug;
          const currentIndex = planOrder.indexOf(currentPlan);
          const targetIndex = planOrder.indexOf(plan.slug);
          const isUpgrade = targetIndex > currentIndex;
          const priceText = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

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
              {/* Plan Name */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.slug === "pro" && (
                  <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full">Popular</span>
                )}
              </div>

              {/* Price */}
              <p className="text-4xl font-medium text-start mb-6">{priceText}</p>

              {/* Features */}
              <ul className="mb-8 space-y-3 text-left">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
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
                  Current ({billing === "monthly" ? "Monthly" : "Yearly"})
                </button>
              ) : isScheduled ? (
                <button
                  disabled
                  className="mt-auto px-6 py-3 bg-muted text-foreground/70 rounded-md border cursor-not-allowed"
                >
                  Scheduled to activate
                </button>
              ) : (
                <button
                  onClick={() => (isUpgrade ? handleUpgrade(plan.slug) : handleDowngrade())}
                  disabled={loadingPlan === plan.slug || loadingPlan === "portal"}
                  className={`mt-auto px-6 py-3 rounded-md transition-colors ${
                    isUpgrade
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  } disabled:opacity-50`}
                >
                  {loadingPlan === plan.slug || loadingPlan === "portal" ? (
                    <Loader2 className="animate-spin mx-auto" />
                  ) : isUpgrade ? (
                    "Upgrade"
                  ) : (
                    "Manage in Portal"
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Info footer */}
      {scheduledPlan && (
        <p className="text-sm mt-10 text-muted-foreground">
          Downgrade to <b>{scheduledPlan}</b> effective on{" "}
          {new Date(membership?.scheduled_plan_effective_at ?? "").toLocaleDateString()}
        </p>
      )}
    </main>
  );
}
