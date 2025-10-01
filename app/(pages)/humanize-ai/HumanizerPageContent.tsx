"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ClipboardCopy,
  Trash2,
  Repeat,
  ChevronRight,
} from "lucide-react";
import { TypographyH1, TypographyP } from "@/components/Typography";
import Sidebar from "./Sidebar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  // Balance state
  const [balance, setBalance] = useState<number | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/auth/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Fetch balance
// Fetch balance
const fetchBalance = async () => {
  if (!user) return;
  setBalanceLoading(true);

  const { data, error } = await supabase
    .from("user_balances")
    .select("balance, plan, starting_balance") // 🔹 include starting_balance
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("❌ Supabase fetch balance error:", error);
  } else if (data) {
    setBalance(data.balance);
    setPlan(data.plan);

    if (data.starting_balance) {
      // If starting_balance already exists, use it
      setStartingBalance(data.starting_balance);
    } else {
      // 🔹 If missing, set it equal to current balance and save it in Supabase
      setStartingBalance(data.balance);

      const { error: updateError } = await supabase
        .from("user_balances")
        .update({ starting_balance: data.balance })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("❌ Error updating starting balance:", updateError);
      }
    }
  } else {
    // No row exists for this user — create one with starting balance
    const defaultBalance = 0;
    setBalance(defaultBalance);
    setPlan(null);
    setStartingBalance(defaultBalance);

    const { error: insertError } = await supabase.from("user_balances").insert({
      user_id: user.id,
      balance: defaultBalance,
      plan: null,
      starting_balance: defaultBalance, // 🔹 new field stored
    });

    if (insertError) {
      console.error("❌ Error inserting user balance:", insertError);
    }
  }

  setBalanceLoading(false);
};


  // Fetch history
  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("humanize_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setHistory(data as HistoryItem[]);
    else if (error) console.error("❌ Supabase fetch history error:", error);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchBalance();
      fetchHistory();
    }
  }, [isLoaded, isSignedIn]);

  // Select history
  const handleSelectHistory = (item: HistoryItem) => {
    setInputText(item.input_text);
    setOutputText(item.output_text);
    setSelectedHistoryId(item.id);
  };

  // Clear session
  const handleClearSession = () => {
    setInputText("");
    setOutputText("");
    setSelectedHistoryId(null);
    setError("");
  };

  const getRequestLimit = (plan: string | null) => {
    if (plan === "free_user" || plan === "basic-plan") return 500;
    if (plan === "pro-plan") return 1500;
    if (plan === "ultra-plan") return 3000;
    return 0;
  };

  // Humanize text
  const handleHumanize = async () => {
    if (!inputText) return;

    const wordCount = inputText.trim()
      ? inputText.trim().split(/\s+/).length
      : 0;
    const requestLimit = getRequestLimit(plan);

    if (wordCount < 50) {
      setError("⚠️ Minimum 50 words required to process text.");
      return;
    }

    if (requestLimit > 0 && wordCount > requestLimit) {
      setError(
        `⚠️ Your plan allows max ${requestLimit} words per request. You entered ${wordCount}.`
      );
      return;
    }

    if (balance !== null && wordCount > balance) {
      setError(
        `⚠️ You entered ${wordCount} words but only ${balance} remain. Please upgrade your plan.`
      );
      return;
    }

    if (balance !== null && balance <= 0) {
      setOutputText(
        "⚠️ You’ve reached your word limit. Please upgrade your plan."
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `AI API error: ${res.statusText}`);
      }

      const data = await res.json();
      const humanizedText = data.humanized || "";
      setOutputText(humanizedText);

      if (isSignedIn && user && humanizedText) {
        const wordCount = inputText.split(/\s+/).length;

        await supabase.from("humanize_history").insert({
          user_id: user.id,
          input_text: inputText,
          output_text: humanizedText,
          words_used: wordCount,
        });

        if (balance !== null) {
          const newBalance = Math.max(balance - wordCount, 0);
          setBalance(newBalance);
        }
        fetchHistory();
      }
    } catch (err: any) {
      console.error(err);
      setOutputText(err.message || "❌ Error: Something went wrong.");
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

  const currentWordCount = inputText.trim()
    ? inputText.trim().split(/\s+/).length
    : 0;
  const requestLimit = getRequestLimit(plan);

  const exceeded =
    currentWordCount < 50 ||
    (balance !== null && currentWordCount > balance) ||
    (requestLimit > 0 && currentWordCount > requestLimit);

  const percent =
    balance !== null && startingBalance !== null && startingBalance > 0
      ? Math.min((balance / startingBalance) * 100, 100)
      : 0;

  let color = "bg-emerald-500";
  if (percent <= 30) color = "bg-red-500";
  else if (percent <= 69) color = "bg-yellow-600";

  return (
    <main className="flex relative min-h-screen mb-24">
      {/* Sidebar */}
      <div className="flex flex-col">
        <Sidebar
          onSelectHistory={handleSelectHistory}
          clearSession={handleClearSession}
          selectedHistoryId={selectedHistoryId}
        />
      </div>

      <div className="flex-1">
        {/* Header */}
        <header className="p-4 h-16 border-b flex justify-between items-center">
          <Link href={"/"}>
            <img
              className="h-6"
              src="https://geteasycal.com/wp-content/uploads/2025/09/kalowrite-logo.png"
              alt="Kalowrite Logo"
            />
          </Link>
        </header>

        {/* Main content */}
        <div className="max-w-7xl space-y-10 py-12 px-8 mx-auto">
          {/* Balance */}
          <section className="flex-1 flex-col items-center gap-2 text-center">
            <div className="w-full mb-4">
              {balanceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                balance !== null && (
                  <div className="flex flex-col items-center w-full space-y-1 lg:w-full">
                    <div className="flex gap-2 p-4 rounded-full mb-4 hover:bg-white/10 transition ease bg-card">
                      {balance !== null && balance <= 0 && (
                        <div className="text-destructive space-x-2 text-xs flex justify-between items-center">
                          <span>⚠️ You’ve used up your balance.</span>
                          <Link
                            href="/pricing"
                            className="text-emerald-500 hover:underline flex"
                          >
                            Upgrade your plan <ChevronRight className="h-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {plan ? `${plan.toUpperCase()}: ` : ""}
                      {balance} / {startingBalance} words left
                    </div>
                    <div className="h-2 bg-muted rounded-full w-64 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
            <Badge className="mb-2">AI Humanizer</Badge>
            <TypographyH1>Humanize Your AI Text</TypographyH1>
            <TypographyP>
              Paste your text below and transform it into natural content.
            </TypographyP>
          </section>

          {/* Input + Output */}
          <section className="grid lg:grid-cols-2 grid-cols-1 gap-6">
            {/* Input box */}
        {/* Input box */}
{/* Input box */}
<div className="flex flex-col border rounded-xl bg-card p-6 min-h-[300px]">
  <h3 className="font-semibold mb-2">Input</h3>

  {/* Scrollable container with overlay */}
  <div className="relative flex-grow overflow-auto rounded-md border bg-background">
    {/* Highlighted text layer */}
    <div
      className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-sm leading-relaxed p-2"
      style={{ fontFamily: "inherit" }}
    >
      {(() => {
        const words = inputText.split(/\s+/);
        const allowed = balance !== null ? balance : Infinity;
        return words.map((word, i) => {
          if (!word) return " ";
          return (
            <span
              key={i}
              className={
                i >= allowed ? "text-muted-foreground" : "text-foreground"
              }
            >
              {word + " "}
            </span>
          );
        });
      })()}
    </div>

    {/* Transparent textarea above */}
    <textarea
      value={inputText}
      onChange={(e) => setInputText(e.target.value)}
      placeholder="Paste your AI text here..."
      className="relative z-10 w-full h-full resize-none outline-none bg-transparent text-transparent caret-foreground text-sm leading-relaxed p-2"
      style={{ fontFamily: "inherit" }}
    />
  </div>

  <div className="mt-2 text-xs flex flex-col">
    <div className="flex justify-between text-muted-foreground">
      <span>{currentWordCount} words</span>
      {balance !== null && <span>{balance} available</span>}
    </div>

    {exceeded && (
      <div className="mt-2 flex justify-start gap-2 text-destructive items-center">
        <span>
          {currentWordCount < 50
            ? "⚠️ Minimum 50 words required"
            : `Word count exceeded (max ${balance ?? requestLimit})`}
        </span>
        {currentWordCount >= 50 && (
          <Link href="/pricing">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs cursor-pointer bg-accent"
            >
              Please upgrade your plan
            </Button>
          </Link>
        )}
      </div>
    )}
  </div>

  <div className="flex justify-end">
  <Button
  size="lg"
  className="text-white mt-4 w-fit bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-md px-6 py-3 flex items-center justify-center"
  onClick={() => {
    if (balance !== null && (balance <= 0 || exceeded)) {
      router.push("/pricing");
    } else {
      handleHumanize();
    }
  }}
  disabled={!inputText || loading || currentWordCount < 50 || exceeded} // 🔹 added `exceeded`
>
  {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
  {loading ? "Humanizing..." : "Humanize"}
</Button>

  </div>
</div>


            {/* Output box */}
            <div className="flex flex-col border rounded-xl bg-card p-6 h-[500px]">
              <h3 className="font-semibold mb-2">Output</h3>
              <div className="flex-grow text-sm overflow-auto whitespace-pre-line rounded-md">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin h-4 w-4" /> Processing...
                  </div>
                ) : (
                  outputText || "Your humanized text will appear here."
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  disabled={!outputText}
                  onClick={() => navigator.clipboard.writeText(outputText)}
                >
                  <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button
                  variant="destructive"
                  disabled={!inputText && !outputText}
                  onClick={handleClearSession}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
                {outputText && balance !== null && balance > 0 && !exceeded && (
                  <Button
                    variant="outline"
                    onClick={handleHumanize}
                    disabled={loading}
                  >
                    <Repeat className="h-4 w-4 mr-1" /> Regenerate
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
