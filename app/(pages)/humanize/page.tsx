"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import ProgressBar from "./ProgressBar";
import InputSection from "./InputSection";
import OutputSection from "./OutputSection";
import HistorySection from "./HistorySection";
import BestPracticesPopup from "./BestPracticesPopup";
import Link from "next/link";

export default function Humanizepagee() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [showPopup, setShowPopup] = useState(false);


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
  const [mode, setMode] = useState<"lite" | "pro">("lite");

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
  const lowBalance = percent < 30;

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
        setPlan(data.plan);
      } else setError(data.error || "Unable to load balance");
    } catch {
      setError("Failed to fetch balance");
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch {
      console.error("Failed to fetch history");
    }
  };

  const clearHistory = async () => {
    try {
      await fetch("/api/history", { method: "DELETE" });
      setHistory([]);
    } catch {
      console.error("Failed to clear history");
    }
  };

  const handleHumanize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const endpoint =
        mode === "pro" ? "/api/pro-humanize" : "/api/lite-humanize";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      const data = await res.text();

      if (!res.ok) setError(data || "Something went wrong");
      else {
        setOutput(data);
        await fetchBalance();
        fetchHistory();
      }
    } catch {
      setError("Request failed. Please try again.");
    }
    setLoading(false);
  };

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
      } finally {
        if (!ignore) setInitialLoading(false);
      }
    };
    if (isLoaded) loadData();
    return () => {
      ignore = true;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && !isSignedIn)
      router.replace(`/auth/sign-in?redirect_url=${pathname}`);
  }, [isLoaded, isSignedIn, pathname, router]);

  if (!isLoaded || initialLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );

  return (
    <>
      {/* ✅ Popup Component */}
      <BestPracticesPopup open={showPopup} onClose={setShowPopup} />


      <main className="max-w-5xl mx-auto py-12 px-4 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-2">Humanizer AI</h1>
          <p className="text-muted-foreground">
            Paste your text below and transform it into natural content.
          </p>
          <button
          onClick={() => setShowPopup(true)}
          className="text-emerald-500 hover:underline">View <span>Best practices</span>
          </button>
        </motion.div>

        <ProgressBar plan={plan} balance={balance} lowBalance={lowBalance} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InputSection
            input={input}
            setInput={setInput}
            handleHumanize={handleHumanize}
            loading={loading}
            error={error}
            balance={balance}
            plan={plan}
            mode={mode}
            setMode={setMode}
          />
          <OutputSection
            output={output}
            setOutput={setOutput}
            handleHumanize={handleHumanize}
            loading={loading}
            copied={copied}
            setCopied={setCopied}
          />
        </div>

        <HistorySection
          history={history}
          clearHistory={clearHistory}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </main>
    </>
  );
}
