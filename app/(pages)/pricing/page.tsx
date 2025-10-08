"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PlansGrid from "./PlansGrid";
import BillingToggle from "./BillingToggle";
import Header from "./Header";
// 💡 Import the cookie helper
import { getFbCookies } from "@/lib/facebook";


export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const [membership, setMembership] = useState<any>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const currentPlan = membership?.plan ?? "free";
  const currentBilling = membership?.billing_interval ?? "monthly";
  const scheduledPlan = membership?.scheduled_plan ?? null;
  const planOrder = ["free", "basic", "pro", "ultra"];

  /* ---------------------------------------------------------------------- */
  /* 📡 Fetch membership (No change)                                        */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const fetchMembership = async () => {
      try {
        const res = await fetch("/api/membership");
        const data = await res.json();
        setMembership(res.ok ? data : { plan: "free" });
      } catch {
        setMembership({ plan: "free" });
      } finally {
        setLoadingUser(false);
      }
    };
    fetchMembership();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ♻️ Resume checkout after login (No change)                             */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const pendingPlan = localStorage.getItem("pending_plan");
    if (isSignedIn && pendingPlan) {
      localStorage.removeItem("pending_plan");
      handleSubscribe(pendingPlan);
    }
  }, [isSignedIn]);

  /* ---------------------------------------------------------------------- */
  /* ⚡️ Subscribe (MODIFIED)                                               */
  /* ---------------------------------------------------------------------- */
  const handleSubscribe = async (plan: string) => {
    // 💡 1. Capture Facebook Cookies BEFORE checking auth or redirecting
    const cookies = getFbCookies(); 
    
    if (!isSignedIn) {
      // If user isn't signed in, save the plan and cookies to localStorage
      // so we can resume checkout after login.
      localStorage.setItem("pending_plan", plan);
      // 💡 Store cookies temporarily for post-login resume
      localStorage.setItem("pending_fbc", cookies.fbc); 
      localStorage.setItem("pending_fbp", cookies.fbp);
      
      openSignIn({
        afterSignInUrl: pathname,
        redirectUrl: pathname,
        appearance: { variables: { colorPrimary: "#2CB175" } },
      });
      return;
    }
    
    // 💡 2. Retrieve cookies if resuming after login
    // This is important because the "resume checkout" logic relies on 
    // the stored data if the user just signed in.
    const fbc_data = localStorage.getItem("pending_fbc") || cookies.fbc;
    const fbp_data = localStorage.getItem("pending_fbp") || cookies.fbp;

    // Clean up temporary cookie storage
    localStorage.removeItem("pending_fbc");
    localStorage.removeItem("pending_fbp");


    setLoadingAction(plan);
    setMessage(null);

    try {
      const res = await fetch("/api/create-subscription-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          plan, 
          billing,
          // 💡 3. Include Facebook data in the API request body
          fbc: fbc_data, 
          fbp: fbp_data,
        }),
      });

      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMessage({ type: "error", text: data.error || "Checkout failed." });
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoadingAction(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* ⚙️ Manage billing (portal) (No change)                                 */
  /* ---------------------------------------------------------------------- */
  const handleManage = async () => {
    if (!isSignedIn) {
      openSignIn({ afterSignInUrl: pathname, redirectUrl: pathname });
      return;
    }

    setLoadingAction("portal");
    setMessage(null);

    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMessage({ type: "error", text: data.error || "Failed to open Stripe Portal." });
    } catch {
      setMessage({ type: "error", text: "Error connecting to Stripe Portal." });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto py-16 px-6 text-center">
    <Header message={message} billing={billing} />


      <BillingToggle billing={billing} setBilling={setBilling} />

      <PlansGrid
        billing={billing}
        currentPlan={currentPlan}
        currentBilling={currentBilling}
        scheduledPlan={scheduledPlan}
        planOrder={planOrder}
        loadingUser={loadingUser}
        loadingAction={loadingAction}
        handleSubscribe={handleSubscribe}
        handleManage={handleManage}
      />
    </main>
  );
}