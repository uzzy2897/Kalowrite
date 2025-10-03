"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/";
  return (
    
    <div className="flex h-screen items-center justify-center">
      <SignIn
   path="/auth/sign-in"            // 👈 required when using routing="path"
   routing="path"
   signUpUrl="/auth/sign-up"
   fallbackRedirectUrl="/"
   forceRedirectUrl={redirectUrl}  // 👈 dynamic redirect

       appearance={{
        elements:{
          formButtonPrimary:'#2CB175',
         
        },
        baseTheme: dark,
        variables: { colorPrimary: '#2CB175', colorTextOnPrimaryBackground:'#FFFFFF', colorBackground:' #2b2b2b',colorInput:" #0C0B08" },
      }}
 
       
      />
    </div>
  );
}
