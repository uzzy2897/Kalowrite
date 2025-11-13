"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { TypographyH1, TypographyP } from "../Typography";
import { cn } from "@/lib/utils";
import { AnimatedShinyText } from "../ui/animated-shiny-text";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

const Hero = () => {
  const [inputText, setInputText] = useState("");
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser(); // 👈 add isLoaded

  // Redirect after sign-in if sessionStorage has a redirect URL
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const redirect = sessionStorage.getItem("afterSignInRedirect");
      if (redirect) {
        router.push(redirect);
        sessionStorage.removeItem("afterSignInRedirect");
      }
    }
  }, [isLoaded, isSignedIn, router]);

  const handleHumanize = () => {
    if (!inputText.trim()) return;
    const encodedText = encodeURIComponent(inputText);
    router.push(`/humanize?text=${encodedText}`);
  };



  return (
    <section className="py-8 relative flex flex-col lg:items-center items-center">
      <img
        src="/hero-background-dots.png"
        alt=""
        className="absolute -z-10"
      />

      <div className="flex flex-col py-10 items-center justify-center w-full max-w-4xl">
        {/* Promo Banner */}
        <div className="flex mb-4 items-center justify-center">
          <div
            className={cn(
              "group rounded-full border mb-6 border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            )}
          >
            <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
              <Link href="/pricing">✨ 50% OFF ON ALL PLANS</Link>
              <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            </AnimatedShinyText>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <TypographyH1>
            Humanize Your Content <br /> Outsmart AI Detectors
          </TypographyH1>
        </div>

        {/* Subheading */}
        <div className="mb-4 text-center">
          <TypographyP>
            KaloWrite humanizes your content and bypasses even the most robust
            AI detection tools.
          </TypographyP>
        </div>
        <SignedOut>
              <div className="flex flex-col items-center gap-2 mt-6">
                <SignInButton
                  mode="modal"
                  signUpForceRedirectUrl="/auth/success"
                  signUpFallbackRedirectUrl="/auth/success"
                >
                  <button
                    className="bg-emerald-500 text-sm font-semibold hover:scale-105 transition ease rounded-md hover:bg-emerald-700 px-4 py-2"
                    onClick={() =>
                      sessionStorage.setItem(
                        "afterSignInRedirect",
                        "/humanize"
                      )
                    }
                  >
                    Try for Free
                  </button>
                </SignInButton>
                <span className="text-xs mt-2 text-muted-foreground">
                  No Credit Card Required
                </span>
              </div>
            </SignedOut>

        {/* Textarea + CTA */}
        <div className="p-4 max-w-2xl w-full mt-6 mx-auto h-fit border bg-card flex flex-col gap-4 rounded-lg">
          <textarea
            placeholder="Paste your text here..."
            className="outline-none flex items-start h-48 w-full border-none resize-none"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {inputText.split(" ").filter(Boolean).length}/500 words
            </span>

            {/* Signed-in users */}
            <SignedIn>
              <button
                onClick={handleHumanize}
                className="bg-emerald-500 text-sm font-semibold hover:scale-105 transition ease rounded-md hover:bg-emerald-700 px-4 py-2"
              >
                Start Humanizing
              </button>
            </SignedIn>
            <SignedOut>
              <div className="flex flex-col items-center gap-2 ">
                <SignInButton
                  mode="modal"
                  signUpForceRedirectUrl="/auth/success"
                  signUpFallbackRedirectUrl="/auth/success"
                >
                  <button
                    className="bg-emerald-500 text-sm font-semibold hover:scale-105 transition ease rounded-md hover:bg-emerald-700 px-4 py-2"
                    onClick={() =>
                      sessionStorage.setItem(
                        "afterSignInRedirect",
                        "/humanize"
                      )
                    }
                  >
                    Humanize
                  </button>
                </SignInButton>
                
              </div>
            </SignedOut>

          
          </div>
          
        </div>
          {/* Signed-out users */}
  
      </div>
    </section>
  );
};

export default Hero;
