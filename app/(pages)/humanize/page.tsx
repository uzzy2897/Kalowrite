"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Copy,
  HistoryIcon,
  Loader2,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";

export default function Humanizepagee() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // ✅ States
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // ✅ Plan quotas
  const planQuotas: Record<string, number> = {
    free: 500,
    basic: 500,
    pro: 1500,
    ultra: 3000,
  };

  const quota = plan ? planQuotas[plan] ?? 500 : 500;
  const percent =
    balance !== null && quota > 0 ? Math.min((balance / quota) * 100, 100) : 0;
  const color =
    percent > 70 ? "bg-emerald-500" : percent > 30 ? "bg-yellow-500" : "bg-red-500";

  const lowBalance = percent < 30;

  // ✅ Derived input word count
  const words = input.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const tooShort = wordCount > 0 && wordCount < 50;
  const exceeded = wordCount > quota;

  // ✅ Fetch balance
  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
        setPlan(data.plan);
      } else {
        setError(data.error || "Unable to load balance");
      }
    } catch {
      setError("Failed to fetch balance");
    }
  };

  // ✅ Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch {
      console.error("Failed to fetch history");
    }
  };

  // ✅ Clear history
  const clearHistory = async () => {
    try {
      await fetch("/api/history", { method: "DELETE" });
      setHistory([]);
    } catch {
      console.error("Failed to clear history");
    }
  };

  // ✅ Load data
  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      if (!isSignedIn) {
        setInitialLoading(false);
        return;
      }

      try {
        await fetchBalance();
        await fetchHistory();

        if (window.location.search.includes("session_id")) {
          await fetchBalance();
        }
      } finally {
        if (!ignore) setInitialLoading(false);
      }
    };

    if (isLoaded) loadData();
    return () => {
      ignore = true;
    };
  }, [isLoaded, isSignedIn]);

  // ✅ Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/auth/sign-in?redirect_url=${pathname}`);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  // ✅ Handle humanize
  const handleHumanize = async () => {
    if (!input.trim()) return;
    if (tooShort || exceeded) return;

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setOutput(data.result);
        await fetchBalance();
        fetchHistory();
      }
    } catch {
      setError("Request failed. Please try again.");
    }

    setLoading(false);
  };

  const hasBalance = balance !== null && balance > 0;

  // ✅ Determine upgrade/top-up visibility based on plan
  const showUpgrade =
    (plan === "free" || plan === "basic" || plan === "pro") && (lowBalance || !hasBalance);
  const showTopup =
    (plan === "pro" || plan === "ultra") && (lowBalance || !hasBalance);

  // ✅ Loading screen
  if (!isLoaded || initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ✅ Render page
  return (
    <main className="max-w-5xl mx-auto py-12 px-4 gap-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold mb-2">Humanizer AI</h1>
        <p className="mb-6 text-muted-foreground">
          Paste your text below and transform it into natural content.
        </p>
      </motion.div>

      {/* Progress + Balance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 space-y-3"
      >
        <div className="flex items-center justify-between flex-col lg:flex-row gap-3 my-4">
          <div className="flex gap-2 items-center">
            <Badge variant="secondary">{plan || "free"}</Badge>
            <Badge variant="outline">
              {balance !== null ? `${balance.toLocaleString()} words left` : "…"}
            </Badge>
          </div>

          {/* ✅ Upgrade / Top-up Logic */}
          {(showUpgrade || showTopup) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col lg:flex-row items-center gap-2"
            >
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
            </motion.div>
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
              className="absolute inset-0 animate-pulse bg-red-500/10 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror" }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {balance !== null
            ? `Using up to ${quota.toLocaleString()} words of your ${plan} plan`
            : "Loading..."}
        </p>
      </motion.div>

      {/* Input + Output */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        {/* Input Section */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="bg-card p-4 h-96 space-y-4 border rounded-xl relative">
            <h2>Your Content</h2>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your AI text here..."
              className="h-[200px] resize-none pb-16"
            />

            {/* Word count */}
            <div className="flex justify-between items-center mt-2 text-sm">
              <p className="text-muted-foreground">
                {wordCount} words / max {quota}
              </p>
              {tooShort && (
                <span className="text-destructive font-medium">
                  Minimum 50 words required
                </span>
              )}
              {exceeded && (
                <span className="text-destructive font-medium">
                  Word count exceeded (max {quota})
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
                  ? `Limit exceeded (${quota})`
                  : "Humanize"}
              </Button>
            </div>
          </div>
          {error && <p className="mt-4 text-destructive text-sm font-medium">{error}</p>}
        </motion.section>

        {/* Output Section */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="bg-card p-4 h-96 space-y-4 border rounded-xl relative">
            <div className="flex justify-between items-center">
              <h2>Output</h2>
              <div className="flex gap-2">
                {/* Copy */}
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

                {/* Clear */}
                <button
                  onClick={() => setOutput("")}
                  className="p-1 hover:bg-muted rounded"
                  title="Clear"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>

                {/* Regenerate */}
                <button
                  onClick={() => handleHumanize()}
                  disabled={!input.trim()}
                  className="p-1 hover:bg-muted rounded disabled:opacity-50"
                  title="Regenerate"
                >
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="h-[200px] overflow-hidden whitespace-pre-wrap text-sm leading-relaxed">
              {loading && !output
                ? "⏳ Processing..."
                : output || "Output will appear here after processing."}
            </div>
          </div>
        </motion.section>
      </motion.div>

      {/* History Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
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
                {history.map((item) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
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
      </motion.section>

      {/* History Detail Modal */}
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
                  <p className="whitespace-pre-wrap">{selectedItem.output_text}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
