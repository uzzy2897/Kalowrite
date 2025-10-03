"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);

  // Plan quotas
  const planQuotas: Record<string, number> = {
    free: 500,
    basic: 500,
    pro: 1500,
    ultra: 3000,
  };

  const quota = planQuotas[plan] ?? 500;
  const percent = balance !== null ? Math.min((balance / quota) * 100, 100) : 0;
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

  useEffect(() => {
    fetchBalance();
    fetchHistory();
    if (window.location.search.includes("session_id")) {
      fetchBalance();
    }
  }, []);

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

        // ✅ Insert new history entry
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_text: input,
            output_text: data.result,
          }),
        });

        // Refresh local history list
        fetchHistory();
      }
    } catch {
      setError("Request failed. Please try again.");
    }

    setLoading(false);
  };

  const hasBalance = balance !== null && balance > 0;

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 gap-8 space-y-6">
      <div>
        <h1 className="text-3xl text-center font-bold mb-2">Humanizer AI</h1>
        <p className=" text-center mb-6">
          Paste your text below and transform it into natural content.
        </p>

   
      {/* Progress + Balance */}
<div className="mb-6 space-y-3">
  <div className="flex items-center gap-3 flex-col lg:flex-row my-4 justify-between">
    <div className="flex gap-2 items-center">
      <Badge variant="secondary">{plan || "free"}</Badge>
      <Badge variant="outline">
        {balance !== null ? `${balance.toLocaleString()} words available` : "…"}
      </Badge>
    </div>

    {/* Actions */}
    {!hasBalance && (
      <div className="flex justify-end flex-col lg:flex-row my-4 lg:my-0 items-center gap-2">
        <p className="text-sm text-destructive px-3 font-medium">
          You’ve run out of words.
        </p>
        <div className="space-x-2">
          <Button asChild className="bg-emerald-600 cursor-pointer text-white">
            <a href="/pricing">Upgrade Plan</a>
          </Button>
          <span>or</span>
          <Button className="font-bold" asChild>
            <a href="/topup">Buy Top-up</a>
          </Button>
        </div>
      </div>
    )}
  </div>

  {/* ✅ Progress Bar shows quota usage only */}
  <div className="h-2 bg-muted rounded-full w-full overflow-hidden">
    <div
      className={`h-full transition-all duration-300 ${color}`}
      style={{ width: `${percent}%` }}
    />
  </div>

  {/* Label under bar */}
  <p className="text-xs text-muted-foreground text-center">
    {balance !== null
      ? `Using up to ${quota.toLocaleString()} words of your ${plan} plan (you still have ${balance.toLocaleString()} total including top-ups)`
      : "Loading..."}
  </p>
</div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Left Section */}
        <section>
          <div className="bg-card p-4 space-y-4 border rounded-xl relative">
            <h2>Your Content</h2>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your AI text here..."
              className="min-h-[200px] resize-none pb-16"
            />

            {/* ✅ Humanize button */}
            <div className="flex items-end justify-end">
              <Button
                className="w-full lg:w-fit"
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
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin " />}
                {hasBalance ? "Humanize" : "Humanize"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-destructive text-sm font-medium">{error}</p>
          )}
        </section>

        {/* Right Section */}
        <section>
          <div className="bg-card p-4 h-full space-y-4 border rounded-xl">
            <h2>Output</h2>
            <div className="min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed">
              {loading
                ? "⏳ Processing..."
                : output
                ? output
                : "Output will appear here after processing."}
            </div>
          </div>
        </section>
      </div>

      {/* ✅ History Section */}
      <section>
        <div className="bg-card border p-4 rounded-xl">
          <div className="flex justify-between pb-4 border-b mb-4">
            <h1 className="text-2xl">History</h1>
            <button
              onClick={clearHistory}
              className="text-destructive hover:underline cursor-pointer"
            >
              Clear history
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">No history yet.</p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-auto">
              {history.map((item) => (
                <li key={item.id} className="p-3 border rounded-md bg-muted">
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
