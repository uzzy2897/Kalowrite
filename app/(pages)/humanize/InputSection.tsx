"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import WordLimitEditor from "@/components/WordInput";

export default function InputSection({
  input,
  setInput,
  handleHumanize,
  loading,
  error,
  balance,
}: {
  input: string;
  setInput: (value: string) => void;
  handleHumanize: () => void;
  loading: boolean;
  error?: string;
  balance: number | null;
}) {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const tooShort = wordCount > 0 && wordCount < 50;
  const exceeded = wordCount > (balance || 0);

  // ✅ Clear handler
  const handleClear = () => setInput("");

  return (
    <motion.section
      whileHover={{ scale: 1.01 }}
      className="transition-all duration-200"
    >
      <div className="bg-card p-4 h-96 space-y-4 border rounded-xl relative">
        <h2 className="font-semibold text-lg">Your Content</h2>

        {/* ✅ Editor */}
        <WordLimitEditor
          wordLimit={balance || 0}
          value={input}
          onChange={setInput}
        />

        {/* ✅ Word counter + warnings */}
        <div className="flex justify-between items-center mt-2 text-sm">
          <p className="text-muted-foreground">
            {wordCount} words / max {balance ?? 0}
          </p>

          {tooShort && (
            <span className="text-destructive">Min 50 words required</span>
          )}
          {exceeded && (
            <span className="text-destructive">
              Word count exceeded (max {balance ?? 0})
            </span>
          )}
        </div>

        {/* ✅ Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          {/* Clear */}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleClear}
            disabled={loading || !input.trim()}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>

          {/* Humanize */}
          <Button
            className="flex items-center gap-2"
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

      {/* ✅ Error message */}
      {error && (
        <p className="mt-4 text-destructive text-sm font-medium">{error}</p>
      )}
    </motion.section>
  );
}
