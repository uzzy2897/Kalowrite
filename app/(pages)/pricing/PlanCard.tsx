"use client";

import { motion } from "framer-motion";
import { CircleCheck, Loader2 } from "lucide-react";

export default function PlanCard({
  plan,
  billing,
  currentPlan,
  currentBilling,
  scheduledPlan,
  planOrder,
  loadingUser,
  loadingAction,
  handleSubscribe,
  handleManage,
}: any) {
  const isCurrent = currentPlan === plan.slug && currentBilling === billing;
  const isScheduled = scheduledPlan === plan.slug;
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(plan.slug);

  // 🧠 Determine upgrade or downgrade
  let isUpgrade = targetIndex > currentIndex;
  if (currentPlan === plan.slug && currentBilling === "monthly" && billing === "yearly") isUpgrade = true;
  if (currentPlan === plan.slug && currentBilling === "yearly" && billing === "monthly") isUpgrade = false;

  // 🎯 Correct price logic
  const showDiscount = billing === "yearly" && plan.oldPrice && plan.discountedPrice;
  const priceText = showDiscount
    ? plan.discountedPrice // e.g. "$14.99"
    : plan.monthlyPrice; // normal monthly price
  const oldPriceText = showDiscount ? plan.oldPrice : null;
  const billingText = billing === "yearly" ? "Billed annually" : "Billed monthly";

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -6, boxShadow: "0 8px 20px rgba(255,255,255,0.05)" }}
      className={`border rounded-2xl p-8 flex flex-col bg-zinc-900 border-zinc-700 hover:border-zinc-500 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-3xl font-semibold text-zinc-100">{plan.name}</h2>
        {plan.slug === "pro" && (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500 font-bold border border-zinc-700">
            MOST POPULAR
          </span>
        )}
      </div>

      {/* Words info */}
      <p className="text-sm text-start  text-emerald-500 mb-2">{plan.wordsPerMonth}</p>

      <div className="mb-6">
  <div className="flex items-baseline gap-1">
    {/* Old Price (strikethrough) */}
    {oldPriceText && (
      <p className="text-sm text-zinc-500 line-through">{oldPriceText}</p>
    )}

    {/* New Price */}
    <p className="text-4xl font-semibold text-emerald-500 leading-none">
      {priceText}
      <span className="text-lg text-zinc-500 ml-1 ">/mo</span>
    </p>

    {/* Billing Text */}
    <p className="text-sm text-zinc-400 ml-2">
      · <span className="underline text-zinc-500">{billingText}</span>
    </p>
  </div>
</div>


      {/* Subscribe Button */}
      {loadingUser ? (
        <div className="mt-4 h-12 bg-zinc-800 animate-pulse rounded-md" />
      ) : isCurrent ? (
        <button
          disabled
          className="mt-4 px-6 py-3 w-full bg-zinc-800 text-zinc-500 rounded-md border border-zinc-700 cursor-not-allowed"
        >
          Current Plan ({billing})
        </button>
      ) : isScheduled ? (
        <button
          disabled
          className="mt-4 px-6 py-3 w-full bg-zinc-800 text-zinc-500 rounded-md border border-zinc-700 cursor-not-allowed"
        >
          Scheduled to activate
        </button>
      ) : currentPlan === "free" ? (
        <button
          onClick={() => handleSubscribe(plan.slug)}
          disabled={loadingAction === plan.slug}
          className="mt-4 px-6 py-3 w-full bg-emerald-500 text-white font-bold hover:bg-emerald-300 rounded-md transition-colors disabled:opacity-50"
        >
          {loadingAction === plan.slug ? <Loader2 className="animate-spin mx-auto" /> : "Subscribe"}
        </button>
      ) : (
        <button
          onClick={handleManage}
          disabled={loadingAction === "portal"}
          className="mt-4 px-6 py-3 w-full bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50"
        >
          {loadingAction === "portal" ? (
            <Loader2 className="animate-spin mx-auto" />
          ) : isUpgrade ? (
            "Upgrade"
          ) : (
            "Downgrade"
          )}
        </button>
      )}

      <hr className="my-6 border-zinc-800" />

      {/* Features List */}
      <ul className="space-y-3 text-left">
        {plan.features.map((f: string, i: number) => (
          <li key={i} className="flex items-center gap-2 text-zinc-200">
            <CircleCheck className="h-5 text-emerald-500/70" /> {f}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
