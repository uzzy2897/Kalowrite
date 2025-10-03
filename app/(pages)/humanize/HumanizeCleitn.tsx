"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HistoryIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";

export default function HumanizeClient({
  initialBalance,
  initialPlan,
  initialHistory,
}: {
  initialBalance: number;
  initialPlan: string;
  initialHistory: any[];
}) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number>(initialBalance);
  const [plan, setPlan] = useState<string>(initialPlan);
  const [history, setHistory] = useState<any[]>(initialHistory);

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

        // Re-fetch updated balance
        const balanceRes = await fetch("/api/user");
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance);
        setPlan(balanceData.plan);

        // Add to history
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input_text: input, output_text: data.result }),
        });

        const histRes = await fetch("/api/history");
        const histData = await histRes.json();
        setHistory(histData.history || []);
      }
    } catch {
      setError("Request failed. Please try again.");
    }

    setLoading(false);
  };

  // ✅ Protect route
  if (!isLoaded) return null;
  if (!isSignedIn) {
    router.replace(`/auth/sign-in?redirect_url=${pathname}`);
    return null;
  }

  const hasBalance = balance !== null && balance > 0;

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
        <p className="mb-6">Paste your text below and transform it into natural content.</p>
      </motion.div>

      {/* Progress + Balance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-3 flex-col lg:flex-row my-4 justify-between">
          <div className="flex gap-2 items-center">
            <Badge variant="secondary">{plan || "free"}</Badge>
            <Badge variant="outline">
              {balance !== null ? `${balance.toLocaleString()} words available` : "…"}
            </Badge>
          </div>

          {!hasBalance && (
            <div className="flex justify-end flex-col lg:flex-row my-4 lg:my-0 items-center gap-2">
              <p className="text-sm text-destructive px-3 font-medium">You’ve run out of words.</p>
              <div className="space-x-2">
                <Button asChild className="bg-emerald-600 text-white">
                  <a href="/pricing">Upgrade Plan</a>
                </Button>
                <span>or</span>
                <Button asChild>
                  <a href="/topup">Buy Top-up</a>
                </Button>
              </div>
            </div>
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
      </motion.div>

      {/* Input + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Input */}
        <section>
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
                className="w-full lg:w-fit"
                onClick={() => {
                  if (!input.trim()) return;
                  if (hasBalance) handleHumanize();
                  else router.push("/pricing");
                }}
                disabled={loading || !input.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin " />}
                Humanize
              </Button>
            </div>
          </div>
          {error && <p className="mt-4 text-destructive text-sm font-medium">{error}</p>}
        </section>

        {/* Output */}
        <section>
          <div className="bg-card p-4 h-full space-y-4 border rounded-xl">
            <h2>Output</h2>
            <div className="min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed">
              {loading && !output
                ? "⏳ Processing..."
                : output || "Output will appear here after processing."}
            </div>
          </div>
        </section>
      </div>

      {/* History */}
      <section>
        <div className="py-4 px-1 border-t">
          <div className="flex justify-between pb-4 border-b mb-4">
            <h1 className="text-xl flex gap-2 items-center">
              <HistoryIcon className="h-5 text-muted-foreground" /> History
            </h1>
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
                      <span className="text-foreground/70">Input:</span> {item.input_text}
                    </p>
                    <p className="text-sm text-foreground/80 truncate">
                      <span className="text-foreground/70">Output:</span> {item.output_text}
                    </p>
                  </motion.li>
                ))}
              </ul>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
