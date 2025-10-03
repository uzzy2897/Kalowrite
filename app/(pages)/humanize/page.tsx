"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HistoryIcon, Loader2 } from "lucide-react";
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

  // ✅ Plan quotas
  const planQuotas: Record<string, number> = {
    free: 500,
    basic: 500,
    pro: 1500,
    ultra: 3000,
  };

  const quota = plan ? planQuotas[plan] ?? 500 : 0;
  const percent =
    balance !== null && quota > 0 ? Math.min((balance / quota) * 100, 100) : 0;
  const color =
    percent > 70 ? "bg-emerald-500" : percent > 30 ? "bg-yellow-500" : "bg-red-500";

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
      if (res.ok) {
        setHistory(data.history || []);
      }
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

  // ✅ Load balance + history
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

  // ✅ Redirect (useEffect, not render)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/auth/sign-in?redirect_url=${pathname}`);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  // ✅ Handle humanize
  const handleHumanize = async () => {
    if (!input.trim()) return;
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

        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_text: input,
            output_text: data.result,
          }),
        });

        fetchHistory();
      }
    } catch {
      setError("Request failed. Please try again.");
    }

    setLoading(false);
  };

  const hasBalance = balance !== null && balance > 0;

  // ✅ Loading UI
  if (!isLoaded || initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
       
      </div>
    );
  }

  // ✅ Render page (signed in)
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
        <p className="mb-6">
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
        <div className="flex items-center gap-3 flex-col lg:flex-row my-4 justify-between">
          <div className="flex gap-2 items-center">
            <Badge variant="secondary">{plan || "free"}</Badge>
            <Badge variant="outline">
              {balance !== null ? `${balance.toLocaleString()} words available` : "…"}
            </Badge>
          </div>

          {!hasBalance && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end flex-col lg:flex-row my-4 lg:my-0 items-center gap-2"
            >
              <p className="text-sm text-destructive px-3 font-medium">
                You’ve run out of words.
              </p>
              <div className="space-x-2">
                <Button asChild className="bg-emerald-600 text-white">
                  <a href="/pricing">Upgrade Plan</a>
                </Button>
                <span>or</span>
                <Button asChild>
                  <a href="/topup">Buy Top-up</a>
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full w-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6 }}
            className={`h-full ${color}`}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {balance !== null
            ? `Using up to ${quota.toLocaleString()} words of your ${plan} plan`
            : "Loading..."}
        </p>
      </motion.div>

      {/* Input + Output */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        {/* Input */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="bg-card p-4 space-y-4 border rounded-xl relative">
            <h2>Your Content</h2>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your AI text here..."
              className="min-h-[200px] resize-none pb-16"
            />
            <div className="flex items-end justify-end">
              <Button
                className="w-full lg:w-fit flex items-center gap-2"
                onClick={() => {
                  if (!input.trim()) return;
                  if (hasBalance) {
                    handleHumanize();
                  } else {
                    router.push("/pricing");
                  }
                }}
                disabled={loading || !input.trim()}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Humanizing..." : "Humanize"}
              </Button>
            </div>
          </div>
          {error && (
            <p className="mt-4 text-destructive text-sm font-medium">{error}</p>
          )}
        </motion.section>

        {/* Output */}
        <motion.section
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="bg-card p-4 h-full space-y-4 border rounded-xl">
            <h2>Output</h2>
            <div className="min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed">
              {loading && !output
                ? "⏳ Processing..."
                : output || "Output will appear here after processing."}
            </div>
          </div>
        </motion.section>
      </motion.div>

      {/* History */}
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
                    className="p-3 border rounded-md bg-muted"
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
    </main>
  );
}
