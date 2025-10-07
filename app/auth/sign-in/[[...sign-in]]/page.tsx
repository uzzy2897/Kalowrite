"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState("/");

  useEffect(() => {
    const url = searchParams.get("redirect_url"); // 👈 must match pricing param
    if (url && typeof window !== "undefined") {
      setRedirectUrl(`${window.location.origin}${url}`);
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <SignIn
        path="/auth/sign-in"
        routing="path"
        signUpUrl="/auth/sign-up"
        fallbackRedirectUrl="/"
        forceRedirectUrl={redirectUrl} // 👈 correct redirect
        appearance={{
          elements: {
            formButtonPrimary: "#2CB175",
          },
          baseTheme: dark,
          variables: {
            colorPrimary: "#2CB175",
            colorTextOnPrimaryBackground: "#FFFFFF",
            colorBackground: "#2b2b2b",
            colorInput: "#0C0B08",
          },
        }}
      />
    </div>
  );
}
