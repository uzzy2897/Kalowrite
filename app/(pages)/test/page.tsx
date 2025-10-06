"use client";

import { useState } from "react";

export default function HomePage() {
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleHumanize = async () => {
    if (!text.trim()) {
      setError("Please enter some text first.");
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.body) {
        setError("No stream returned.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;
        setOutput((prev) => prev + chunk);
      }
    } catch (err) {
      console.error(err);
      setError("Network or stream error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-center text-teal-800">
        Gemini 2.5 Flash Text Humanizer (Streaming)
      </h1>

      <textarea
        className="w-full max-w-2xl p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 mb-4 text-gray-800"
        rows={7}
        placeholder="Paste or write text to humanize..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleHumanize}
        disabled={loading}
        className={`px-6 py-2 rounded-md text-white font-semibold transition ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-teal-700 hover:bg-teal-800"
        }`}
      >
        {loading ? "Streaming..." : "Humanize Text"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {output && (
        <div className="mt-6 w-full max-w-2xl bg-gray-100 border border-gray-300 p-4 rounded-lg shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-700">Result:</h2>
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {output}
          </p>
        </div>
      )}
    </div>
  );
}
