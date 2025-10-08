"use client";

import { motion } from "framer-motion";
import { CircleCheck, XCircle } from "lucide-react";

export default function Header({
  message,
  billing,
}: {
  message: { type: "success" | "error"; text: string } | null;
  billing: "monthly" | "yearly";
}) {
  const isYearly = billing === "yearly";

  return (
    <>
      {/* Header Intro */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold mb-3 text-zinc-100">
          Simple, Transparent Pricing
        </h1>

        <p className="text-zinc-400 mb-8">
          Get started for free — upgrade or cancel anytime through your billing
          portal.
        </p>

        {/* Dynamic billing notice */}
        {isYearly ? (
          <p className="text-sm text-zinc-500 mb-10">
            <span className="font-medium text-zinc-300">You're saving 50%</span> with yearly billing 🎉
          </p>
        ) : (
          <p className="text-sm text-zinc-500 mb-10">
            <span className="font-medium text-zinc-300">Save 50%</span> when you switch to yearly billing
          </p>
        )}
      </motion.div>

      {/* Feedback message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`mb-8 mx-auto max-w-md flex items-center gap-3 p-3 rounded-md text-sm border
            ${
              message.type === "success"
                ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                : "bg-zinc-800 border-zinc-700 text-red-400"
            }`}
        >
          {message.type === "success" ? (
            <CircleCheck className="w-5 h-5 shrink-0 text-zinc-400" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 text-red-500" />
          )}
          <span>{message.text}</span>
        </motion.div>
      )}
    </>
  );
}
