"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackSignup } from "@/lib/fb/trackSignup";
import { trackSignupGA } from "@/lib/ga/trackSignup"; // 👈 add this

function canTrack() {
  if (typeof window === "undefined") return false;
  const consent = localStorage.getItem("fb_consent");
  return consent === "true" || !consent;
}

export default function SignupSuccessPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) {
        router.push("/humanize");
        return;
      }

      if (!canTrack()) {
        console.log("⚠️ Tracking skipped (no consent)");
        router.push("/humanize");
        return;
      }

      const tracked = sessionStorage.getItem("signup_tracked");
      if (!tracked) {
        try {
          // ✅ Fire both trackers
          await trackSignup(email);   // Facebook Pixel + CAPI
          trackSignupGA(email);       // Google Analytics 4

          sessionStorage.setItem("signup_tracked", "true");
          console.log("✅ Signup tracked (FB + GA)");
        } catch (err) {
          console.warn("⚠️ Signup tracking failed:", err);
        }
      }

      setTimeout(() => router.push("/humanize"), 600);
    };

    run();
  }, [user, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center px-4">
      <h1 className="text-2xl font-semibold mb-2">Welcome to KaloWrite 🎉</h1>
      <p className="text-zinc-400 max-w-md">Preparing your workspace...</p>
    </div>
  );
}
