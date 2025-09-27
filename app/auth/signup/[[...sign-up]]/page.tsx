// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Page() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <SignUp 
     
     appearance={{
      elements:{
        formButtonPrimary:'#2CB175',
        footer: "hidden", // 🚀 removes the "Secured by Clerk"
       
      },
      baseTheme: dark,
      variables: { colorPrimary: '#2CB175', colorTextOnPrimaryBackground:'#FFFFFF', colorBackground:' #2b2b2b',colorInput:" #0C0B08" },
    }}

     
    />
    </main>
  );
}
