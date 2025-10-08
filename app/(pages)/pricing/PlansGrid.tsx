"use client";

import { motion } from "framer-motion";
import PlanCard from "./PlanCard";

const plans = [
  {
    name: "Basic",
    slug: "basic",
    monthlyPrice: "$9.99",
    yearlyPrice: "$59.88", // $4.99/mo equivalent × 12 months
    oldPrice: "$9.99",
    discountedPrice: "$4.99", // shows under yearly billing
    wordsPerMonth: "5,000 words per month",
    features: [
      "500 words per request",
      "Bypass AI detectors",
      "Plagiarism-free writing",
      "Human-like style",
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    monthlyPrice: "$29.99",
    yearlyPrice: "$119.88", // $9.99/mo equivalent × 12 months
    oldPrice: "$29.99",
    discountedPrice: "$9.99",
    wordsPerMonth: "15,000 words per month",
    features: [
      "1,500 words per request",
      "All Basic features",
      "Top-up credits anytime",
      "Advanced humanization engine",
    ],
  },
  {
    name: "Ultra",
    slug: "ultra",
    monthlyPrice: "$59.99",
    yearlyPrice: "$359.88", // $29.99/mo equivalent × 12 months
    oldPrice: "$59.99",
    discountedPrice: "$29.99",
    wordsPerMonth: "30,000 words per month",
    features: [
      "3,000 words per request",
      "All Pro features",
      "Priority support",
      "Unlimited rewording",
    ],
  },
];

export default function PlansGrid({
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
  return (
    <motion.div
      className="grid gap-8 md:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
    >
      {plans.map((plan) => (
        <PlanCard
          key={plan.slug}
          plan={plan}
          billing={billing}
          currentPlan={currentPlan}
          currentBilling={currentBilling}
          scheduledPlan={scheduledPlan}
          planOrder={planOrder}
          loadingUser={loadingUser}
          loadingAction={loadingAction}
          handleSubscribe={handleSubscribe}
          handleManage={handleManage}
        />
      ))}
    </motion.div>
  );
}
