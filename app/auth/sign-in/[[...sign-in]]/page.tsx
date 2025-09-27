"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <SignIn

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
