"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Loader2, Plus, Menu, HomeIcon, Home, LucideHome, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import Link from "next/link";

type HistoryItem = {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
};

export default function SidebarWrapper({
  onSelectHistory,
  clearSession,
  selectedHistoryId,
}: {
  onSelectHistory: (item: HistoryItem) => void;
  clearSession: () => void;
  selectedHistoryId: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button (mobile only) */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-5 right-4 z-50  rounded-full shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sidebar
        onSelectHistory={onSelectHistory}
        clearSession={clearSession}
        selectedHistoryId={selectedHistoryId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

function Sidebar({
  onSelectHistory,
  clearSession,
  selectedHistoryId,
  isOpen,
  onClose,
}: {
  onSelectHistory: (item: HistoryItem) => void;
  clearSession: () => void;
  selectedHistoryId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, isSignedIn, isLoaded } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchHistory();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <aside className="w-64 border-r bg-card h-screen sticky top-0 hidden md:flex items-center justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </aside>
    );
  }

  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 border-r bg-card h-screen sticky top-0 flex-col">
        <SidebarContent
          fullName={fullName}
          email={user?.primaryEmailAddress?.emailAddress}
          history={history}
          historyLoading={historyLoading}
          selectedHistoryId={selectedHistoryId}
          onSelectHistory={onSelectHistory}
          clearSession={clearSession}
        />
      </aside>

      {/* Mobile Sidebar (drawer) */}
      {isOpen && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-80 bg-black/50 md:hidden"
          onClick={onClose}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r flex flex-col"
            onClick={(e) => e.stopPropagation()} // prevent close when clicking inside
          >
            <SidebarContent
              fullName={fullName}
              email={user?.primaryEmailAddress?.emailAddress}
              history={history}
              historyLoading={historyLoading}
              selectedHistoryId={selectedHistoryId}
              onSelectHistory={(item) => {
                onSelectHistory(item);
                onClose();
              }}
              clearSession={clearSession}
            />
          </div>
        </motion.div>
      )}
    </>
  );
}

function SidebarContent({
  fullName,
  email,
  history,
  historyLoading,
  selectedHistoryId,
  onSelectHistory,
  clearSession,
}: {
  fullName: string | null | undefined;
  email: string | null | undefined;
  history: HistoryItem[];
  historyLoading: boolean;
  selectedHistoryId: string | null;
  onSelectHistory: (item: HistoryItem) => void;
  clearSession: () => void;
}) {
  return (
    <>
  
  <div className="flex  gap-4 text-muted-foreground flex-col p-4 border-b">

<Link href={"/"} className="flex items-center text-sm gap-1 hover:text-white transition ease hover:underline"><ArrowLeft className="h-4"/>Back to Home</Link>

</div>
     
      {/* User profile */}
      <div className="flex items-center justify-between p-4 border-b">
        
        
        <div className="text-sm font-medium">
          <p className="text-foreground">{fullName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <UserButton />
      </div>
 

      {/* New Session */}

      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full flex items-center cursor-pointer hover:scale-95 transition ease-in justify-center gap-2"
          onClick={clearSession}
        >
          <Plus className="h-4 w-4" /> New Session
        </Button>
      </div>
      

      {/* History */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
          History
        </h3>

        {historyLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="animate-spin h-4 w-4" /> Loading...
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  selectedHistoryId === item.id
                    ? "bg-emerald-500 text-white"
                    : "hover:bg-muted"
                }`}
                onClick={() => onSelectHistory(item)}
              >
                {item.input_text.substring(0, 30)}...
              </button>
            ))}
          </div>
        )}
      
      </div>
    </>
  );
}
