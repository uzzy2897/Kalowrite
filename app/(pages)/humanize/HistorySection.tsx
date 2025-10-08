"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HistoryIcon } from "lucide-react";

// ✅ Define a type for your history items
interface HistoryItem {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
}

// ✅ Define props type for the component
interface HistorySectionProps {
  history: HistoryItem[];
  clearHistory: () => void;
  selectedItem: HistoryItem | null;
  setSelectedItem: (item: HistoryItem | null) => void;
}

export default function HistorySection({
  history,
  clearHistory,
  selectedItem,
  setSelectedItem,
}: HistorySectionProps) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="py-4 px-1 border-t">
        <div className="flex justify-between pb-4 border-b mb-4">
          <h1 className="text-xl flex gap-2 items-center">
            <HistoryIcon className="h-5 text-muted-foreground" /> History
          </h1>
          <button
            onClick={clearHistory}
            className="text-destructive hover:underline cursor-pointer"
          >
            Clear history
          </button>
        </div>

        <AnimatePresence>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">No history yet.</p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-auto">
              {history.map((item: HistoryItem) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 border rounded-md bg-muted cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedItem(item)}
                >
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  <p className="font-medium truncate">
                    <span className="text-foreground/70">Input:</span>{" "}
                    {item.input_text}
                  </p>
                  <p className="text-sm text-foreground/80 truncate">
                    <span className="text-foreground/70">Output:</span>{" "}
                    {item.output_text}
                  </p>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-neutral-900 p-6 rounded-xl max-w-2xl w-full shadow-lg space-y-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">History Detail</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-destructive hover:underline"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 text-sm max-h-[60vh] overflow-auto">
                <div>
                  <p className="border-b font-bold mb-1">Input</p>
                  <p className="whitespace-pre-wrap border-b pb-2">
                    {selectedItem.input_text}
                  </p>
                </div>
                <div>
                  <p className="font-bold border-b mb-1">Output</p>
                  <p className="whitespace-pre-wrap">
                    {selectedItem.output_text}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
