"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackSignup } from "@/lib/fb/trackSignup";

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

      // 👇 Prevent sending the event twice in one session
      const tracked = sessionStorage.getItem("fb_signup_tracked");
      if (!tracked) {
        await trackSignup(email);
        sessionStorage.setItem("fb_signup_tracked", "true");
      }

      // 🚀 Redirect after short delay (for reliability)
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
