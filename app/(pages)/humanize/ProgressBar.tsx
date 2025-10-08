"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProgressBar({
  plan,
  balance,
  lowBalance,
}: {
  plan: string | null;
  balance: number | null;
  lowBalance: boolean;
}) {
  // ✅ 1️⃣ Define plan quotas
  const planQuotas: Record<string, number> = {
    free: 500,
    basic: 500,
    pro: 15000,
    ultra: 30000,
  };

  // ✅ 2️⃣ Resolve quota safely and compute percent
  const quota = plan ? planQuotas[plan] || 500 : 500;
  const numericBalance = Number(balance) || 0;
  const percent = Math.min((numericBalance / quota) * 100, 100);

  // ✅ 3️⃣ Determine color dynamically
  let color = "bg-emerald-500";
  if (percent < 10) color = "bg-red-500";
  else if (percent < 30) color = "bg-yellow-500";
  else if (percent < 60) color = "bg-amber-500";

  // ✅ 4️⃣ Determine UI state
  const hasBalance = numericBalance > 0;
  const showUpgrade =
    (plan === "free" || plan === "basic" || plan === "pro") &&
    (lowBalance || !hasBalance);
  const showTopup =
    (plan === "pro" || plan === "ultra") &&
    (lowBalance || !hasBalance);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between flex-col lg:flex-row gap-3">
        <div className="flex gap-2 items-center">
          <Badge variant="secondary">{plan || "free"}</Badge>
          <Badge variant="outline">
            {balance !== null ? `${numericBalance.toLocaleString()} words left` : "…"}
          </Badge>
        </div>

        {(showUpgrade || showTopup) && (
          <div className="flex flex-col lg:flex-row items-center gap-2">
            <p
              className={`text-sm font-medium ${
                hasBalance ? "text-yellow-600 dark:text-yellow-400" : "text-destructive"
              }`}
            >
              {hasBalance
                ? "⚠️ Your balance is getting low."
                : "❌ You’ve run out of words."}
            </p>

            <div className="flex gap-2">
              {showUpgrade && (
                <Button asChild className="bg-emerald-600 text-white">
                  <a href="/pricing">Upgrade Plan</a>
                </Button>
              )}
              {showTopup && (
                <Button asChild variant="secondary">
                  <a href="/topup">Buy Top-up</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Progress bar */}
      <div className="relative h-2 bg-muted rounded-full w-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full ${color}`}
        />
        {lowBalance && (
          <motion.div
            className="absolute inset-0 animate-pulse bg-red-500/10"
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {balance !== null
          ? `Using up to ${quota.toLocaleString()} words of your ${plan || "free"} plan`
          : "Loading..."}
      </p>
    </motion.div>
  );
}
