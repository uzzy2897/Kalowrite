"use client";

import { useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PlansGrid from "./PlansGrid";
import BillingToggle from "./BillingToggle";
import Header from "./Header";


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
  /* 📡 Fetch membership                                                    */
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
  /* ♻️ Resume checkout after login                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const pendingPlan = localStorage.getItem("pending_plan");
    if (isSignedIn && pendingPlan) {
      localStorage.removeItem("pending_plan");
      handleSubscribe(pendingPlan);
    }
  }, [isSignedIn]);

  /* ---------------------------------------------------------------------- */
  /* ⚡️ Subscribe                                                          */
  /* ---------------------------------------------------------------------- */
  const handleSubscribe = async (plan: string) => {
    if (!isSignedIn) {
      localStorage.setItem("pending_plan", plan);
      openSignIn({
        afterSignInUrl: pathname,
        redirectUrl: pathname,
        appearance: { variables: { colorPrimary: "#2CB175" } },
      });
      return;
    }

    setLoadingAction(plan);
    setMessage(null);

    try {
      const res = await fetch("/api/create-subscription-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
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
  /* ⚙️ Manage billing (portal)                                             */
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
