"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardCopy, Trash2, Repeat } from "lucide-react";
import { TypographyH1, TypographyP } from "@/components/Typography";
import Sidebar from "./Sidebar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

// 🆕 Upgrade Modal
function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96 space-y-4">
        <h2 className="text-lg font-semibold">Upgrade Required</h2>
        <p className="text-sm text-muted-foreground">
          Word count exceeded your current plan. Please upgrade to process longer texts.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Link href="/pricing">
            <Button>Upgrade Plan</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// 🆕 Top Up Modal
function TopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [words, setWords] = useState(1000);

  const price = (words / 1000) * 5; // e.g. $5 per 1000 words (adjust pricing model here)

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[400px] space-y-4">
        <h2 className="text-lg font-semibold">Top Up Credits</h2>
        <p className="text-sm text-muted-foreground">
          Buy extra words instantly. One-time purchase, not recurring.
        </p>

        {/* Slider */}
        <input
          type="range"
          min={1000}
          max={30000}
          step={1000}
          value={words}
          onChange={(e) => setWords(Number(e.target.value))}
          className="w-full"
        />

        <div className="flex justify-between text-sm">
          <span>{words.toLocaleString()} words</span>
          <span className="font-medium">${price.toFixed(2)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {/* 🔗 Replace with Stripe checkout or Supabase function */}
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}

type HistoryItem = {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
  words_used?: number;
};

export default function HumanizerPageContent() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get("text") || "";
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [inputText, setInputText] = useState(initialText);
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Balance state
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Word count + limits
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const maxWordsPerRequest = plan === "free_user" ? 500 : Infinity;
  const exceededPlanLimit = wordCount > maxWordsPerRequest;

  // Modals
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/auth/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Fetch balance
  const fetchBalance = async () => {
    if (!user) return;
    setBalanceLoading(true);
    const { data, error } = await supabase
      .from("user_balances")
      .select("balance, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setBalance(data.balance);
      setPlan(data.plan);
    } else {
      setBalance(0);
      setPlan("free_user");
    }
    setBalanceLoading(false);
  };

  // Fetch history
  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("humanize_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setHistory(data as HistoryItem[]);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchBalance();
      fetchHistory();
    }
  }, [isLoaded, isSignedIn]);

  // Clear session
  const handleClearSession = () => {
    setInputText("");
    setOutputText("");
    setSelectedHistoryId(null);
  };

  // Humanize text
  const handleHumanize = async () => {
    if (!inputText) return;

    if (exceededPlanLimit) {
      setShowUpgrade(true);
      return;
    }

    if (balance !== null && balance <= 0) {
      // 🆕 Paid users get Top Up option
      if (plan !== "free_user") {
        setShowTopUp(true);
      } else {
        setOutputText("⚠️ You’ve reached your word limit. Please upgrade your plan.");
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) throw new Error(`AI API error: ${res.statusText}`);
      const data = await res.json();
      const humanizedText = data.humanized || "";
      setOutputText(humanizedText);

      if (isSignedIn && user && humanizedText) {
        await supabase.from("humanize_history").insert({
          user_id: user.id,
          input_text: inputText,
          output_text: humanizedText,
          words_used: wordCount,
        });

        if (balance !== null) {
          const newBalance = Math.max(balance - wordCount, 0);
          setBalance(newBalance);
          await supabase
            .from("user_balances")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);
        }
      }
    } catch (err) {
      console.error(err);
      setOutputText("❌ Error: Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex relative min-h-screen mb-24">
      <Sidebar onSelectHistory={() => {}} clearSession={handleClearSession} selectedHistoryId={selectedHistoryId} />

      <div className="flex-1">
        <header className="p-4 h-16 border-b flex justify-between items-center">
          <Link href={"/"}>
            <img className="h-6" src="https://geteasycal.com/wp-content/uploads/2025/09/kalowrite-logo.png" alt="Kalowrite Logo" />
          </Link>
          {/* Permanent Top Up in account (placeholder link) */}
          <Link href="/account/billing">
            <Button variant="outline" size="sm">Top up credits</Button>
          </Link>
        </header>

        <div className="max-w-7xl space-y-10 py-12 px-8 mx-auto">
          <section className="flex-1 flex-col items-center gap-2 text-center">
            {exceededPlanLimit && (
              <div className="text-red-500 text-sm mb-2">
                ⚠️ Word count exceeded. Please upgrade your plan to increase the limit.
              </div>
            )}
            <Badge className="mb-2">AI Humanizer</Badge>
            <TypographyH1>Humanize Your AI Text</TypographyH1>
            <TypographyP>Paste your text below and transform it into natural content.</TypographyP>
          </section>

          {/* Input/Output */}
          <section className="grid lg:grid-cols-2 grid-cols-1 gap-6">
            <div className="flex flex-col border rounded-xl bg-card p-6 min-h-[300px] relative">
              <h3 className="font-semibold mb-2">Input</h3>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your AI text here..."
                className={`flex-grow resize-none outline-none text-sm leading-relaxed ${
                  exceededPlanLimit ? "text-gray-400" : "text-black"
                }`}
              />
              <div className="text-xs mt-2">
                Words: {wordCount} / {maxWordsPerRequest === Infinity ? "∞" : maxWordsPerRequest}
              </div>
            </div>

            <div className="flex flex-col border rounded-xl bg-card p-6 h-[500px]">
              <h3 className="font-semibold mb-2">Output</h3>
              <div className="flex-grow text-sm overflow-auto whitespace-pre-line bg-muted/30 rounded-md p-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin h-4 w-4" /> Processing...
                  </div>
                ) : (
                  outputText || "Your humanized text will appear here."
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Humanize Button */}
        <section className="flex justify-center">
          <Button
            size="lg"
            className="lg:static fixed bottom-16 w-64 lg:w-fit text-white left-1/2 -translate-x-1/2 z-50 bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full"
            onClick={handleHumanize}
            disabled={!inputText || loading}
          >
            {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
            {exceededPlanLimit ? "Upgrade" : loading ? "Humanizing..." : "Humanize"}
          </Button>
        </section>
      </div>

      {/* Modals */}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />
    </main>
  );
}
