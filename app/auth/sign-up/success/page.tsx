"use client";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { trackSignup } from "@/lib/fb/trackSignup";

export default function SignupSuccessPage() {
  const { user } = useUser();

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      trackSignup(user.primaryEmailAddress.emailAddress);
    }
  }, [user]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white">
      <h1 className="text-2xl font-semibold">Welcome to KaloWrite 🎉</h1>
      <p className="text-zinc-400 mt-2">We’ve recorded your signup successfully.</p>
    </div>
  );
}
