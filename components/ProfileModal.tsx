"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user } = useUser();
  const [tab, setTab] = useState<"info" | "billing" | "usage" | "security">("info");

  const [membership, setMembership] = useState("free");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const quota: Record<string, number> = {
    free: 500,
    basic: 5000,
    pro: 15000,
    ultra: 30000,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/user");
        const userData = await res.json();
        setBalance(userData.balance ?? 0);
        setMembership(userData.plan ?? "free");
      } catch (err) {
        console.error("❌ Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleManageBilling = async () => {
    const res = await fetch("/api/create-portal-session", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Delete your account permanently?")) return;
    await fetch("/api/delete-account", { method: "POST" });
    onClose();
  };

  const limit = quota[membership] ?? 500;
  const percent = Math.min((balance / limit) * 100, 100);
  const progressColor =
    percent > 70 ? "bg-emerald-500" : percent > 30 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-2xl h-[90vh] flex flex-col md:flex-row relative text-sm">
        {/* Sidebar - turns into top tab bar on mobile */}
        <aside className="flex md:flex-col border-b md:border-b-0 md:border-r p-2 gap-2 bg-neutral-900 text-xs overflow-x-auto md:overflow-visible">
          {["info", "billing", "usage", "security"].map((key) => (
            <button
              key={key}
              className={`px-3 py-1 rounded whitespace-nowrap capitalize ${
                tab === key ? "bg-neutral-800 font-medium" : "opacity-80"
              }`}
              onClick={() => setTab(key as any)}
            >
              {key}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-xs px-2 py-1 border rounded hover:bg-muted"
          >
            ✕
          </button>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : (
            <>
              {tab === "info" && (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold">User Info</h2>
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.imageUrl || "https://placehold.co/40"}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full border"
                    />
                    <div>
                      <p className="font-medium">{user?.fullName}</p>
                      <p className="text-xs text-neutral-500">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                  <SignOutButton>
                    <button className="mt-3 w-full text-xs border rounded px-3 py-2 hover:bg-muted">
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              )}

              {tab === "billing" && (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold">Billing</h2>
                  <p>
                    Active Plan: <b className="capitalize">{membership}</b>
                  </p>
                  <button
                    onClick={handleManageBilling}
                    className="text-xs border rounded px-3 py-2 hover:bg-muted"
                  >
                    Manage Billing
                  </button>
                </div>
              )}

              {tab === "usage" && (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold">Usage</h2>
                  <p>
                    {balance} / {limit} words
                  </p>
                  <div className="w-full bg-muted h-2 rounded">
                    <div
                      className={`h-2 rounded ${progressColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )}

              {tab === "security" && (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold">Security</h2>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full text-xs border rounded px-3 py-2 hover:bg-muted text-red-500"
                  >
                    Delete Account
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
