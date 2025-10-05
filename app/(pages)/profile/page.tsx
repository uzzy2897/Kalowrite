"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user } = useUser();
  const router = useRouter();

  const [membership, setMembership] = useState("free");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (res.ok) {
        setShowConfirm(false);
        alert("Account deleted successfully.");
        router.push("/"); // ✅ Redirect to home
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete account.");
      }
    } catch (err) {
      console.error("❌ Delete account error:", err);
      alert("Server error. Try again later.");
    } finally {
      setDeleting(false);
    }
  };

  const limit = quota[membership] ?? 500;
  const percent = Math.min((balance / limit) * 100, 100);

  let progressColor = "bg-red-500";
  if (percent > 70) progressColor = "bg-emerald-500";
  else if (percent > 30) progressColor = "bg-orange-500";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-neutral-500" />
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col items-center space-y-3">
        <img
          src={user?.imageUrl || "https://placehold.co/100"}
          alt="Avatar"
          className="h-20 w-20 rounded-full border object-cover"
        />
        <div className="text-center">
          <p className="text-lg font-semibold">{user?.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-neutral-800 text-white capitalize">
          {membership} plan
        </span>
      </div>

      {/* Usage */}
      <div className="border rounded-lg p-6 bg-card space-y-3">
        <h2 className="text-sm font-medium">Usage</h2>
        <p className="text-sm">
          {balance} / {limit} words
        </p>
        <div className="w-full bg-muted h-2 rounded">
          <div
            className={`h-2 rounded ${progressColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="border rounded-lg p-6 bg-card space-y-3">
        <button
          onClick={handleManageBilling}
          className="w-full text-sm border rounded px-3 py-2 hover:bg-muted"
        >
          Manage Billing
        </button>

        <SignOutButton>
          <button className="w-full text-sm border rounded px-3 py-2 hover:bg-muted">
            Sign Out
          </button>
        </SignOutButton>

        <button
          onClick={() => setShowConfirm(true)}
          className="w-full text-sm border rounded px-3 py-2 hover:bg-muted text-red-500"
        >
          Delete Account
        </button>
      </div>

      {/* 🧩 Confirmation Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 shadow-lg w-[90%] max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-center">
              Confirm Account Deletion
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              This action cannot be undone. All your data will be permanently
              deleted.
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className={`px-4 py-2 text-sm rounded text-white ${
                  deleting
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
