import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/sections/Footer";
import { dark } from "@clerk/themes";

// DM Sans setup
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400","500","700"] });

export const metadata: Metadata = {
  title: "Kolowrite – AI Humanizer",
  description: "Transform AI-generated text into natural, human-like content with Kolowrite.",
  keywords: ["AI humanizer", "Kolowrite", "AI to human text", "natural writing"],
  authors: [{ name: "Kolowrite Team" }],
  openGraph: {
    title: "Kolowrite – Humanize Your AI Text",
    description: "Paste AI text and turn it into human-quality content instantly.",
    url: "https://kolowrite.com",
    siteName: "Kolowrite",
    images: [
      {
        url: "https://geteasycal.com/wp-content/uploads/2025/09/kolowrite-logo.png",
        width: 1200,
        height: 630,
        alt: "Kolowrite Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kolowrite – AI Humanizer",
    description: "Turn AI text into human-like writing instantly.",
    images: ["https://geteasycal.com/wp-content/uploads/2025/09/kolowrite-logo.png"],
    creator: "@Kolowrite",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider 
    appearance={{
      baseTheme: dark,
      elements: {
        footer: "hidden", // ✅ this removes "Secured by Clerk"
      },
     
     
    }}
    
>
  
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${dmSans.variable} bg-stone-950  antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <Navbar />

            {children}

            <Footer />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
