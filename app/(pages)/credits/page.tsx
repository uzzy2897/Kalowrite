"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreditsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"success" | "canceled" | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setStatus("success");
    } else if (searchParams.get("canceled") === "1") {
      setStatus("canceled");
    }
  }, [searchParams]);

  return (
    <main className="max-w-xl mx-auto py-20 px-6 text-center">
      {status === "success" && (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-emerald-600">
            ✅ Payment Successful!
          </h1>
          <p className="text-gray-700">
            Your word credits have been added to your balance. 🎉
          </p>
          <button
            onClick={() => router.push("/humanizer-ai")}
            className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-lg shadow-md font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {status === "canceled" && (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-red-600">❌ Payment Canceled</h1>
          <p className="text-gray-700">
            Your payment was canceled. No charges were made.
          </p>
          <button
            onClick={() => router.push("/add-more-words")}
            className="mt-6 bg-gray-800 hover:bg-gray-900 text-white py-3 px-6 rounded-lg shadow-md font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {!status && (
        <div>
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      )}
    </main>
  );
}
