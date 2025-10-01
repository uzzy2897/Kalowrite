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

    if (error) {
      console.error("❌ Supabase fetch balance error:", error);
    } else if (data) {
      setBalance(data.balance);
      setPlan(data.plan);
    } else {
      console.log("ℹ️ No balance found, setting default 0");
      setBalance(0);
      setPlan(null);
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
  };

  // Humanize text
  const handleHumanize = async () => {
    if (!inputText) return;

    if (balance !== null && balance <= 0) {
      setOutputText("⚠️ You’ve reached your word limit. Please upgrade your plan.");
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
        const wordCount = inputText.split(/\s+/).length;

        // Insert history
        const { data: newHistory, error: historyError } = await supabase
          .from("humanize_history")
          .insert({
            user_id: user.id,
            input_text: inputText,
            output_text: humanizedText,
            words_used: wordCount,
          })
          .select();

        if (historyError) console.error("❌ Supabase insert error:", historyError);
        else if (newHistory?.length) {
          setSelectedHistoryId(newHistory[0].id);
          fetchHistory();
        }

        // Deduct balance
        if (balance !== null) {
          const newBalance = Math.max(balance - wordCount, 0);
          setBalance(newBalance);

          const { error: balanceError } = await supabase
            .from("user_balances")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);

          if (balanceError) {
            console.error("❌ Supabase balance update error:", balanceError);
          }
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
      <div className="flex flex-col">
        <Sidebar
          onSelectHistory={handleSelectHistory}
          clearSession={handleClearSession}
          selectedHistoryId={selectedHistoryId}
        />
      </div>

      <div className="flex-1">
      <header className="p-4 h-16 border-b flex justify-between items-center">
  <Link href={"/"}>
    <img
      className="h-6"
      src="https://geteasycal.com/wp-content/uploads/2025/09/kalowrite-logo.png"
      alt="Kalowrite Logo"
    />
  </Link>

</header>


        <div className="max-w-7xl space-y-10 py-12 px-8 mx-auto">
       
          <section className="flex-1 flex-col items-center gap-2 text-center">
          <div className="w-full mb-4">

{balanceLoading ? (
  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
) : (
  balance !== null && (
    <div className="flex flex-col items-center w-full space-y-1 lg:w-full">
      {/* Text info */}
      <div className="text-sm text-muted-foreground">
        {plan ? `${plan.toUpperCase()}: ` : ""}{balance} words left
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full w-64 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{
            width: `${
              plan === "free_user"
                ? (balance / 100) * 100
                : plan === "basic-plan"
                ? (balance / 500) * 100
                : plan === "pro-plan"
                ? (balance / 1500) * 100
                : plan === "ultra-plan"
                ? (balance / 3000) * 100
                : 0
            }%`,
          }}
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

          <section className="grid lg:grid-cols-2 grid-cols-1 gap-6">
            {/* Input */}
        {/* Input */}
<div className="flex flex-col border rounded-xl bg-card p-6 min-h-[300px]">
  <h3 className="font-semibold mb-2">Input</h3>
  <textarea
    value={inputText}
    onChange={(e) => {
      const text = e.target.value;
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

      // ✅ Prevent input longer than balance
      if (balance !== null && wordCount > balance) {
        return; // Block further typing
      }

      setInputText(text);
    }}
    onPaste={(e) => {
      const pasted = e.clipboardData.getData("text");
      const pastedWords = pasted.trim() ? pasted.trim().split(/\s+/).length : 0;

      if (balance !== null && pastedWords > balance) {
        e.preventDefault();
        alert(`⚠️ You only have ${balance} words left. Please paste a shorter text.`);
      }
    }}
    placeholder="Paste your AI text here..."
    className="flex-grow resize-none outline-none bg-transparent text-sm leading-relaxed"
  />

  {/* ✅ Live word counter */}
  <div className="mt-2 text-xs text-muted-foreground flex justify-between">
    <span>
      {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words
    </span>
    {balance !== null && (
      <span>
        {balance} available
      </span>
    )}
  </div>
</div>


            {/* Output */}
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
                {outputText && balance !== null && balance > 0 && (
                  <Button variant="outline" onClick={handleHumanize} disabled={loading}>
                    <Repeat className="h-4 w-4 mr-1" /> Regenerate
                  </Button>
                )}
              </div>
              {balance !== null && balance <= 0 && (
                <div className="text-red-500 text-xs mt-2">
                  ⚠️ You’ve used up your balance.{" "}
                  <Link href="/pricing" className="underline">
                    Upgrade your plan
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="flex justify-center">
          <Button
            size="lg"
            className="lg:static fixed bottom-16 w-64 lg:w-fit text-white left-1/2 -translate-x-1/2 z-50 bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full px-6 py-3 flex items-center justify-center"
            onClick={handleHumanize}
            disabled={!inputText || loading || (balance !== null && balance <= 0)}
          >
            {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
            {loading ? "Humanizing..." : "Humanize"}
          </Button>
        </section>
      </div>
    </main>
  );
}