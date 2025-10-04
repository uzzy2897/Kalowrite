"use client";

import { useState } from "react";

export default function CancelSubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCancel() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/cancel-subscription", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessage(data.message || "Your subscription will be canceled.");
    } catch (err: any) {
      setMessage(err.message || "Error while canceling subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f0f] text-gray-100 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-2xl font-semibold">Manage Subscription</h1>
        <p className="text-gray-400 text-sm">
          You can cancel your subscription. You’ll still have access until the end of your billing period.
        </p>

        <button
          onClick={handleCancel}
          disabled={loading}
          className={`px-6 py-3 w-full rounded-md border border-gray-700 
            ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800"} 
            transition-colors duration-200`}
        >
          {loading ? "Canceling..." : "Cancel Subscription"}
        </button>

        {message && (
          <p className="text-sm text-gray-400 border border-gray-800 rounded-md p-3 bg-[#161616]">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
