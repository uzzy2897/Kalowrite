"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trackSignup } from "@/lib/fb/trackSignup";
import { trackSignupGA } from "@/lib/ga/trackSignup"; // GA: no PII!

function hasConsent() {
  if (typeof window === "undefined") return false;
  // Treat undefined as allowed (until banner sets a value)
  const fb = localStorage.getItem("fb_consent");
  const ga = localStorage.getItem("ga_consent");
  const fbOk = fb === "true" || !fb;
  const gaOk = ga === "true" || !ga;
  return fbOk && gaOk;
}

export default function SignupSuccessPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const firedOnceRef = useRef(false); // prevents double fire in StrictMode

  useEffect(() => {
    if (!isLoaded) return;               // wait for Clerk
    if (!isSignedIn || !user) {          // no user ⇒ bounce
      router.replace("/humanize");
      return;
    }
    if (firedOnceRef.current) return;    // guard: no double-run
    firedOnceRef.current = true;

    const email = user.primaryEmailAddress?.emailAddress;
    const userId = user.id;
    const flagKey = `signup_tracked_${userId}`;

    // if we already tracked this user in this browser session, skip
    const alreadyTracked = typeof window !== "undefined" && sessionStorage.getItem(flagKey);
    if (alreadyTracked) {
      router.replace("/humanize");
      return;
    }

    const run = async () => {
      if (!hasConsent()) {
        console.log("⚠️ Tracking skipped (no consent)");
        router.replace("/humanize");
        return;
      }

      try {
        // 1) Facebook Pixel/CAPI — your fn can hash email server-side
        if (email) {
          await trackSignup(email);
        } else {
          console.warn("No email found for FB tracking");
        }

        // 2) Google Analytics 4 — DO NOT send PII (no email)
        //    Use non-PII userId and recommended "sign_up" name inside the helper
        trackSignupGA({ method: "clerk_email", userId });

        sessionStorage.setItem(flagKey, "true");
        console.log("✅ Signup tracked (FB + GA)");
      } catch (err) {
        console.warn("⚠️ Signup tracking failed:", err);
      } finally {
        router.replace("/humanize");
      }
    };

    void run();
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center px-4">
      <h1 className="text-2xl font-semibold mb-2">Welcome to KaloWrite 🎉</h1>
      <p className="text-zinc-400 max-w-md">Preparing your workspace...</p>
    </div>
  );
}
