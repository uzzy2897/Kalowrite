import type { Metadata } from 'next';
import { DM_Sans, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { ClerkProvider } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/sections/Footer';
import { ThemeProvider } from '@/components/theme-provider';
import CookieBanner from '@/components/sections/CookieBanner';
import { dark } from '@clerk/themes';
import Script from 'next/script';

/* -------------------- Fonts -------------------- */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

/* -------------------- SEO Metadata -------------------- */
export const metadata: Metadata = {
  title: 'KaloWrite – AI Humanizer',
  description:
    'Transform AI-generated text into natural, human-like content with KaloWrite.',
  keywords: [
    'AI humanizer',
    'KaloWrite',
    'AI to human text',
    'natural writing',
  ],
  authors: [{ name: 'KaloWrite Team' }],
  openGraph: {
    title: 'KaloWrite – Humanize Your AI Text',
    description:
      'Paste AI text and turn it into human-quality content instantly.',
    url: 'https://kalowrite.com',
    siteName: 'KaloWrite',
    images: [
      {
        url: 'https://geteasycal.com/wp-content/uploads/2025/09/kolowrite-logo.png',
        width: 1200,
        height: 630,
        alt: 'KaloWrite Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KaloWrite – AI Humanizer',
    description: 'Turn AI text into human-like writing instantly.',
    images: [
      'https://geteasycal.com/wp-content/uploads/2025/09/kolowrite-logo.png',
    ],
    creator: '@KaloWrite',
  },
};

/* -------------------- Root Layout -------------------- */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        elements: {
          footer: 'hidden', // hides “Secured by Clerk”
        },
      }}
    >
      <html lang='en' className='dark' suppressHydrationWarning>
        <head>
          {/* 🟦 Facebook Meta Pixel Code */}
          {pixelId && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${pixelId}');
                  fbq('track', 'PageView');
                `,
              }}
            />
          )}
          {/* End Facebook Meta Pixel Code */}
        </head>
        <body
          className={`${dmSans.variable} ${geistSans.variable} ${geistMono.variable} bg-stone-950 antialiased`}
        >
          <ThemeProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem
            disableTransitionOnChange
          >
            <Navbar />
            {children}
            <Footer />
          </ThemeProvider>

          {/* ✅ Cookie Consent + Analytics Loader */}
          <CookieBanner />
          {/* ✅ Google Analytics 4 */}
          <Script
            src='https://www.googletagmanager.com/gtag/js?id=G-N337Q74SB4'
            strategy='afterInteractive'
          />
          <Script id='google-analytics' strategy='afterInteractive'>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-N337Q74SB4',{debug_mode: false});
              gtag('config', 'AW-17683674158');
            `}
          </Script>
        </body>
      </html>
    </ClerkProvider>
  );
}
