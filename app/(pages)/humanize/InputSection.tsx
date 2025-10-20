"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import WordLimitEditor from "@/components/WordInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InputSection({
  input,
  setInput,
  handleHumanize,
  loading,
  error,
  balance,
  plan,
  mode,
  setMode,
}: {
  input: string;
  setInput: (value: string) => void;
  handleHumanize: () => void;
  loading: boolean;
  error?: string;
  balance: number | null;
  plan: string | null;
  mode: "lite" | "pro";
  setMode: (value: "lite" | "pro") => void;
}) {
  const planLimits: Record<string, number> = {
    free: 500,
    basic: 500,
    pro: 1500,
    ultra: 3000,
  };

  const maxPerRequest = plan
    ? planLimits[plan.toLowerCase()] ?? 500
    : 500;

  const words = input.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const tooShort = wordCount > 0 && wordCount < 50;
  const exceeded = wordCount > maxPerRequest;
  const noBalance = !balance || balance <= 0;

  const handleClear = () => setInput("");

  return (
    <motion.section
      whileHover={{ scale: 1.01 }}
      className="transition-all duration-200"
    >
      <div className="bg-card p-4 h-96 space-y-4 border rounded-xl relative">
        {/* ✅ Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Your Content</h2>

          {/* ✅ ShadCN Mode Selector */}
          <Select
            value={mode}
            onValueChange={(value) => setMode(value as "lite" | "pro")}
          >
            <SelectTrigger className="w-[100px] h-8 text-sm">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lite">Lite</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ✅ Editor */}
        <WordLimitEditor
          wordLimit={maxPerRequest}
          value={input}
          onChange={setInput}
        />

        {/* ✅ Word counter + warnings */}
        <div className="flex justify-between items-center mt-2 text-sm">
          <p className="text-muted-foreground">
            {wordCount} words / max {maxPerRequest}
          </p>

          {tooShort && (
            <span className="text-destructive">Min 50 words required</span>
          )}
          {exceeded && (
            <span className="text-destructive">
              Word count exceeded (max {maxPerRequest})
            </span>
          )}
          {noBalance && (
            <span className="text-destructive">Insufficient word balance</span>
          )}
        </div>

        {/* ✅ Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleClear}
            disabled={loading || !input.trim()}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>

          <Button
            className="flex items-center gap-2"
            onClick={handleHumanize}
            disabled={
              loading || !input.trim() || tooShort || exceeded || noBalance
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? "Humanizing..."
              : tooShort
              ? "Min 50 words required"
              : exceeded
              ? `Limit exceeded (${maxPerRequest})`
              : noBalance
              ? "No credits left"
              : "Humanize"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-destructive text-sm font-medium">{error}</p>
      )}
    </motion.section>
  );
}
