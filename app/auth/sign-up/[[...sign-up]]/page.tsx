"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState("/");

  useEffect(() => {
    const url = searchParams.get("redirect_url"); // 👈 same param
    if (url && typeof window !== "undefined") {
      setRedirectUrl(`${window.location.origin}${url}`);
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <SignUp
        path="/auth/sign-up"
        routing="path"
        signInUrl="/auth/sign-in"
        fallbackRedirectUrl="/"
        forceRedirectUrl={redirectUrl}
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
