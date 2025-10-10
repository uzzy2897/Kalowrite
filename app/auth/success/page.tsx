"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackSignup } from "@/lib/fb/trackSignup";

/* -------------------------------------------------------------------------- */
/* ✅ Helper: check user consent (optional, if you have cookie banner)        */
/* -------------------------------------------------------------------------- */
function canTrack() {
  if (typeof window === "undefined") return false;
  const consent = localStorage.getItem("fb_consent"); // optional: your cookie consent key
  return consent === "true" || !consent; // allow if accepted or not required
}

/* -------------------------------------------------------------------------- */
/* ✅ Page Component                                                          */
/* -------------------------------------------------------------------------- */
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

      // ⚙️ Optional consent check
      if (!canTrack()) {
        console.log("⚠️ Tracking skipped (no consent)");
        router.push("/humanize");
        return;
      }

      // 👇 Prevent sending twice per session
      const tracked = sessionStorage.getItem("fb_signup_tracked");
      if (!tracked) {
        try {
          // 🧠 Send both Pixel + CAPI
          await trackSignup(email);
          sessionStorage.setItem("fb_signup_tracked", "true");
          console.log("✅ Facebook signup tracked successfully");
        } catch (err) {
          console.warn("⚠️ Facebook signup tracking failed:", err);
        }
      }

      // ⏳ Redirect after short delay for reliability
      setTimeout(() => router.push("/humanize"), 600);
    };

    run();
  }, [user, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center px-4">
      <h1 className="text-2xl font-semibold mb-2">Welcome to KaloWrite 🎉</h1>
      <p className="text-zinc-400 max-w-md">
        Preparing your workspace...
      </p>
    </div>
  );
}
