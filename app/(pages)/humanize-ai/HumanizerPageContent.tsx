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

type HistoryItem = {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
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

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/auth/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Fetch user history
  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("humanize_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setHistory(data as HistoryItem[]);
    else if (error) console.error("Supabase fetch history error:", error);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchHistory();
    }
  }, [isLoaded, isSignedIn]);

  // Select history item
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

  // Humanize text via API
  const handleHumanize = async () => {
    if (!inputText) return;

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
        // Insert history
        const { data: newHistory, error: historyError } = await supabase
          .from("humanize_history")
          .insert({
            user_id: user.id,
            input_text: inputText,
            output_text: humanizedText,
          })
          .select();
        if (historyError) console.error("Supabase insert error:", historyError);
        else if (newHistory?.length) {
          setSelectedHistoryId(newHistory[0].id);
          fetchHistory();
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
    <main className="flex relative min-h-screen">
      {/* Sidebar */}
      <Sidebar
        onSelectHistory={handleSelectHistory}
        clearSession={handleClearSession}
        selectedHistoryId={selectedHistoryId}
      />

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl mx-auto py-12 space-y-10 px-6">
        {/* Header */}
        <section className="flex flex-col items-center gap-2 text-center">
          <Badge className="mb-2">AI Humanizer</Badge>
          <TypographyH1>Humanize Your AI Text</TypographyH1>
          <TypographyP>Paste your text below and transform it into natural content.</TypographyP>
        </section>

        {/* Input / Output */}
        <section className="grid lg:grid-cols-2 grid-cols-1 gap-6">
          {/* Input */}
          <div className="flex flex-col border rounded-xl bg-card p-6 min-h-[300px]">
            <h3 className="font-semibold mb-2">Input</h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your AI text here..."
              className="flex-grow resize-none outline-none bg-transparent text-sm leading-relaxed"
            />
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
              {outputText && (
                <Button variant="outline" onClick={handleHumanize} disabled={loading}>
                  <Repeat className="h-4 w-4 mr-1" /> Regenerate
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Floating Humanize Button */}
        <section className="flex justify-center">
          <Button
            size="lg"
            className="lg:static fixed bottom-6 w-64 lg:w-fit text-white left-1/2 -translate-x-1/2 z-50 bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full px-6 py-3 flex items-center justify-center"
            onClick={handleHumanize}
            disabled={!inputText || loading}
          >
            {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
            {loading ? "Humanizing..." : "Humanize"}
          </Button>
        </section>
      </div>
    </main>
  );
}
