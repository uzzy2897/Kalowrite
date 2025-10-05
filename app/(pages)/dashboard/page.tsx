"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useUser();

  const [membership, setMembership] = useState("free");
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<any[]>([]);
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
        const [userRes, usageRes, membershipRes] = await Promise.all([
          fetch("/api/user"),
          fetch("/api/history"),
          fetch("/api/membership-history"),
        ]);

        const userData = await userRes.json();
        const usageJson = await usageRes.json();
        const membershipJson = await membershipRes.json();

        setBalance(userData.balance ?? 0);
        setMembership(userData.plan ?? "free");
        setHistory(Array.isArray(usageJson.history) ? usageJson.history : []);
        setMembershipHistory(
          Array.isArray(membershipJson.history) ? membershipJson.history : []
        );
      } catch (err) {
        console.error("❌ Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const { url, error } = await res.json();
      if (error) alert(error);
      else window.location.href = url;
    } catch (err) {
      console.error("❌ Portal session error:", err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account?")) return;
    const res = await fetch("/api/delete-account", { method: "POST" });
    const data = await res.json();
    alert(data.error ? data.error : "Account deleted");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  const limit = quota[membership] ?? 500;
  const percent = Math.min((balance / limit) * 100, 100);

  // Dynamic color for progress bar
  let progressColor = "bg-red-500";
  if (percent > 70) progressColor = "bg-emerald-500";
  else if (percent > 30) progressColor = "bg-orange-500";

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.fullName}
          </p>
        </div>
        <UserButton />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Membership */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-sm font-medium mb-2">Membership</h2>
          <p className="text-lg font-semibold capitalize">{membership}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleManageBilling}
              className="text-sm border rounded px-3 py-1 hover:bg-muted"
            >
              Manage Billing
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-sm font-medium mb-2">Usage</h2>
          <p className="text-lg font-semibold">
            {balance} / {limit} words
          </p>
          <div className="mt-3 w-full bg-muted h-2 rounded">
            <div
              className={`h-2 rounded ${progressColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Account */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-sm font-medium mb-2">Account</h2>
          <button
            onClick={handleDeleteAccount}
            className="text-sm border rounded px-3 py-1 hover:bg-muted"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Usage History */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-sm font-medium mb-4">Usage History</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground">No usage history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Words</th>
                  <th className="py-2 px-3">Input</th>
                  <th className="py-2 px-3">Output</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted">
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">{item.words_used}</td>
                    <td className="py-2 px-3 truncate max-w-xs">
                      {item.input_text}
                    </td>
                    <td className="py-2 px-3 truncate max-w-xs">
                      {item.output_text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Membership History */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-sm font-medium mb-4">Membership History</h2>
        {membershipHistory.length === 0 ? (
          <p className="text-muted-foreground">No membership history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Period</th>
                </tr>
              </thead>
              <tbody>
                {membershipHistory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted">
                    <td className="py-2 px-3 capitalize">{item.plan}</td>
                    <td className="py-2 px-3">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: item.currency || "USD",
                      }).format(item.price / 100)}
                    </td>
                    <td className="py-2 px-3 capitalize">{item.status}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {item.period_start
                        ? `${new Date(item.period_start).toLocaleDateString()} → ${new Date(
                            item.period_end
                          ).toLocaleDateString()}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
