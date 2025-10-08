"use client";

import { motion } from "framer-motion";
import { Check, Copy, RefreshCcw, Trash2 } from "lucide-react";

export default function OutputSection({
  output,
  setOutput,
  handleHumanize,
  loading,
  copied,
  setCopied,
}: any) {
  return (
    <motion.section whileHover={{ scale: 1.01 }}>
      <div className="bg-card h-96 space-y-4 border rounded-xl relative overflow-y-auto">
        <div className="flex justify-between items-center sticky top-0 bg-card z-10 px-4 py-2">
          <h2>Output</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (output) {
                  navigator.clipboard.writeText(output);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="p-1 hover:bg-muted rounded"
              title={copied ? "Copied!" : "Copy"}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <button
              onClick={() => setOutput("")}
              className="p-1 hover:bg-muted rounded"
              title="Clear"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleHumanize()}
              disabled={!output}
              className="p-1 hover:bg-muted rounded disabled:opacity-50"
              title="Regenerate"
            >
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 whitespace-pre-wrap text-sm leading-relaxed">
          {loading && !output
            ? "⏳ Processing..."
            : output || "Output will appear here after processing."}
        </div>
      </div>
    </motion.section>
  );
}
