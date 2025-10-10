"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackSignup } from "@/lib/fb/trackSignup";

/* -------------------------------------------------------------------------- */
/* 📋 Helper: check consent and prevent duplicate tracking                    */
/* -------------------------------------------------------------------------- */
function canTrack() {
  if (typeof window === "undefined") return false;
  const consent = localStorage.getItem("fb_consent"); // set by CookieBanner
  return consent === "true" || !consent; // track if accepted or not required
}

export default function SignupSuccessPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      if (!canTrack()) {
        router.push("/humanize");
        return;
      }

      const email = user.primaryEmailAddress.emailAddress;
      const tracked = sessionStorage.getItem("fb_signup_tracked");

      if (!tracked) {
        try {
          await trackSignup(email);
          sessionStorage.setItem("fb_signup_tracked", "true");
          console.log("✅ Facebook signup event sent");
        } catch (err) {
          console.error("FB signup tracking failed:", err);
        }
      }

      // ✅ Redirect after tracking (small delay for reliability)
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
