"use client";

import { useState, useEffect } from "react";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("");

  // Fetch user balance + plan from /api/user
  useEffect(() => {
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
      } catch (err) {
        console.error(err);
        setError("Failed to fetch balance");
      }
    };
    fetchBalance();
  }, []);

  const handleHumanize = async () => {
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

        // Decrease local balance after request
        if (balance !== null) {
          const wordsUsed = input.trim().split(/\s+/).length;
          setBalance((prev) => (prev !== null ? prev - wordsUsed : null));
        }
      }
    } catch (err) {
      setError("Request failed. Check console.");
      console.error(err);
    }

    setLoading(false);
  };

  const hasBalance = balance !== null && balance > 0;

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      <section>
        <h1 className="text-3xl font-bold mb-6">🚀 Humanizer AI Test</h1>

        {/* Show user plan & balance */}
        <div className="mb-6 flex items-center gap-4">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md text-sm">
            Plan: {plan || "free"}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">
            Balance: {balance !== null ? balance : "…"} words
          </span>
        </div>

        {/* Input section */}
        <div className="mb-4">
          <label className="block font-medium mb-2">📝 Your Content</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste AI text here..."
            className="w-full p-4 border rounded-md h-40 text-sm"
          />
        </div>

        {/* Humanize button or Upgrade/TOP-UP */}
        {hasBalance ? (
          <button
            onClick={handleHumanize}
            disabled={loading || !input.trim()}
            className="mt-2 px-6 py-2 bg-emerald-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? "Humanizing..." : "Humanize"}
          </button>
        ) : (
          <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md text-center">
            <p className="text-red-600 font-medium mb-2">
              ⚠️ You’ve run out of words.
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href="/pricing"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md"
              >
                Upgrade Plan
              </a>
              <a
                href="/topup"
                className="px-4 py-2 bg-emerald-600 text-white rounded-md"
              >
                Buy Top-up
              </a>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </section>

      {/* Output section - always visible */}
      <section>
        <h2 className="text-lg font-semibold mb-2">✅ Output</h2>
        <div className="border p-4 rounded-md bg-card whitespace-pre-wrap min-h-[10rem]">
          {loading
            ? "⏳ Processing..."
            : output
            ? output
            : "Output will appear here after processing."}
        </div>
      </section>
    </main>
  );
}
