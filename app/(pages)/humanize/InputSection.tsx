"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import WordLimitEditor from "@/components/WordInput";

export default function InputSection({
  input,
  setInput,
  handleHumanize,
  loading,
  error,
  balance,
}: any) {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const tooShort = wordCount > 0 && wordCount < 50;
  const exceeded = wordCount > (balance || 0);

  return (
    <motion.section whileHover={{ scale: 1.01 }}>
      <div className="bg-card p-4 h-96 space-y-4 border rounded-xl relative">
        <h2>Your Content</h2>
        <WordLimitEditor wordLimit={balance || 0} value={input} onChange={setInput} />

        <div className="flex justify-between items-center mt-2 text-sm">
          <p className="text-muted-foreground">
            {wordCount} words / max {balance ?? 0}
          </p>
          {tooShort && <span className="text-destructive">Min 50 words required</span>}
          {exceeded && (
            <span className="text-destructive">
              Word count exceeded (max {balance ?? 0})
            </span>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            className="w-full lg:w-fit flex items-center gap-2"
            onClick={handleHumanize}
            disabled={loading || !input.trim() || tooShort || exceeded}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? "Humanizing..."
              : tooShort
              ? "Min 50 words required"
              : exceeded
              ? `Limit exceeded (${balance ?? 0})`
              : "Humanize"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-4 text-destructive text-sm font-medium">{error}</p>}
    </motion.section>
  );
}
