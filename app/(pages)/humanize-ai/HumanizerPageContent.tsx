"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("");

  // Plan quotas (match your backend logic)
  const planQuotas: Record<string, number> = {
    free: 500,
    basic: 500,
    pro: 1500,
    ultra: 3000,
  };

  // Compute percentage + color
  const quota = planQuotas[plan] ?? 500;
  const percent = balance !== null ? Math.min((balance / quota) * 100, 100) : 0;
  const color =
    percent > 70
      ? "bg-emerald-500"
      : percent > 30
      ? "bg-yellow-500"
      : "bg-red-500";

  // 🔄 Fetch user balance + plan
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

  useEffect(() => {
    fetchBalance();
    if (window.location.search.includes("session_id")) {
      fetchBalance();
    }
  }, []);

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
      }
    } catch {
      setError("Request failed. Please try again.");
    }

    setLoading(false);
  };

  const hasBalance = balance !== null && balance > 0;

  return (
    <main className="max-w-6xl mx-auto py-12 px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Section */}
      <section>
        <h1 className="text-3xl font-bold mb-6">🚀 Humanizer AI</h1>

        {/* Plan + Balance */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Plan: {plan || "free"}</Badge>
            <Badge variant="outline">
              {balance !== null ? `${balance}/${quota}` : "…"} words
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full w-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${color}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>📝 Your Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your AI text here..."
              className="min-h-[160px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6">
          {hasBalance ? (
            <Button
              onClick={handleHumanize}
              disabled={loading || !input.trim()}
              className="w-full md:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Humanizing..." : "Humanize"}
            </Button>
          ) : (
            <Card className="p-4 border-destructive/50 bg-destructive/10 text-center">
              <p className="text-sm font-medium mb-3">
                ⚠️ You’ve run out of words.
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <Button asChild variant="secondary">
                  <a href="/pricing">Upgrade Plan</a>
                </Button>
                <Button asChild>
                  <a href="/topup">Buy Top-up</a>
                </Button>
              </div>
            </Card>
          )}
        </div>

        {error && (
          <p className="mt-4 text-destructive text-sm font-medium">{error}</p>
        )}
      </section>

      {/* Right Section */}
      <section>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>✅ Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed">
              {loading
                ? "⏳ Processing..."
                : output
                ? output
                : "Output will appear here after processing."}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
