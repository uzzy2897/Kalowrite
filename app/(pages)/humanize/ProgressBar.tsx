"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProgressBar({
  plan,
  balance,
  quota,
}: {
  plan: string | null;
  balance: number | null;
  quota: number;
}) {
  const hasBalance = balance !== null && balance > 0;
  const percent =
    balance && quota ? Math.min((balance / quota) * 100, 100) : 0;

  // 🎨 Auto color logic
  let color = "bg-emerald-500";
  let lowBalance = false;

  if (percent <= 10) {
    color = "bg-red-500";
    lowBalance = true;
  } else if (percent <= 30) {
    color = "bg-yellow-500";
    lowBalance = true;
  }

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
            {balance !== null ? `${balance.toLocaleString()} words left` : "…"}
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

      {/* Progress Bar */}
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
          ? `Using up to ${quota.toLocaleString()} words of your ${plan} plan`
          : "Loading..."}
      </p>
    </motion.div>
  );
}
