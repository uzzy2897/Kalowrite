'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trackSignup } from '@/lib/fb/trackSignup';
import { ensureGaInitialized } from '@/lib/ga/initGa';

const GA_SIGNUP_ENDPOINT = '/api/ga/sign-up';

function hasConsent() {
  if (typeof window === 'undefined') return false;

  // First check localStorage (our custom consent)
  const cookieConsent = localStorage.getItem('cookie_consent');
  if (cookieConsent === 'accepted') {
    return true; // User accepted via our banner
  }

  // Then check Cookiebot consent (if available and initialized)
  if ((window as any).Cookiebot) {
    const cookiebot = (window as any).Cookiebot;
    const consent = cookiebot.consent;
    if (consent) {
      // Cookiebot is available - check if statistics/marketing cookies are allowed
      // Statistics cookies are needed for GA4
      const hasCookiebotConsent =
        consent.statistics === true || consent.marketing === true;
      if (hasCookiebotConsent) {
        return true;
      }
    }
  }

  // No consent found
  return false;
}

export default function SignupSuccessPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const firedOnceRef = useRef(false); // prevents double fire in StrictMode

  useEffect(() => {
    if (!isLoaded) return; // wait for Clerk
    if (!isSignedIn || !user) {
      // no user ⇒ bounce
      router.replace('/humanize');
      return;
    }
    if (firedOnceRef.current) return; // guard: no double-run
    firedOnceRef.current = true;

    const email = user.primaryEmailAddress?.emailAddress;
    const userId = user.id;
    // Use a timestamp-based key to allow tracking multiple sign-ups in the same session
    const flagKey = `signup_tracked_${userId}_${Date.now()}`;

    // Check if we've already tracked this specific user ID recently (within 5 seconds)
    // This prevents duplicate tracking from React StrictMode but allows separate sign-ups
    const recentTracking =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(`signup_tracked_${userId}`);
    if (recentTracking) {
      const lastTracked = parseInt(recentTracking, 10);
      const now = Date.now();
      // If tracked within last 5 seconds, skip (likely duplicate from StrictMode)
      if (now - lastTracked < 5000) {
        router.replace('/humanize');
        return;
      }
    }

    const run = async () => {
      // Check consent first
      const hasUserConsent = hasConsent();
      console.log('🔍 Consent check:', {
        hasConsent: hasUserConsent,
        cookiebot: !!(window as any).Cookiebot,
        localStorage: localStorage.getItem('cookie_consent'),
      });

      if (!hasUserConsent) {
        console.warn('⚠️ Tracking skipped (no consent)');
        console.warn(
          '💡 User must accept cookies before signing up to track events'
        );
        router.replace('/humanize');
        return;
      }

      // Ensure GA script starts loading immediately once consent is confirmed
      const gaInitialized = ensureGaInitialized();
      if (!gaInitialized) {
        console.warn('⚠️ GA initialization failed even though consent exists');
      }

      try {
        // 1) Facebook Pixel/CAPI — your fn can hash email server-side
        if (email) {
          console.log('📊 Tracking Facebook sign-up...');
          await trackSignup(email);
          console.log('✅ Facebook sign-up tracked');
        } else {
          console.warn('⚠️ No email found for FB tracking');
        }

        // 2) Google Analytics 4 — DO NOT send PII (no email)
        //    Detect sign-up method (email vs Google OAuth)
        let signUpMethod = 'email';

        try {
          // Check if user has external accounts (OAuth providers)
          // Clerk user object has externalAccounts array
          const externalAccounts = (user as any).externalAccounts;
          if (
            externalAccounts &&
            Array.isArray(externalAccounts) &&
            externalAccounts.length > 0
          ) {
            // Get the first external account's provider
            const firstAccount = externalAccounts[0];
            const provider =
              firstAccount?.provider || firstAccount?.strategy || '';

            // Check for Google OAuth (provider can be "oauth_google", "google", etc.)
            if (
              provider &&
              (provider.toLowerCase().includes('google') ||
                provider === 'oauth_google')
            ) {
              signUpMethod = 'google';
            } else if (provider) {
              signUpMethod = provider; // Use the actual provider name
            }
          }
        } catch (err) {
          console.warn(
            '⚠️ Could not detect sign-up method, defaulting to email:',
            err
          );
        }

        console.log('📊 Sign-up method detected:', signUpMethod);

        const sendServerSideSignupEvent = async () => {
          const payload = { method: signUpMethod, userId };
          try {
            const response = await fetch(GA_SIGNUP_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              keepalive: true,
            });
            console.log(
              '🚀 ~ sendServerSideSignupEvent ~ response:',
              response.ok,
              response.status
            );
            if (!response.ok) {
              const details = await response.json().catch(() => ({}));
              console.warn('⚠️ GA4 server sign_up failed:', {
                status: response.status,
                details,
              });
            } else {
              console.log('✅ GA4 server sign_up sent');
            }
          } catch (err) {
            console.warn('⚠️ Failed to send GA4 server sign_up event:', err);
          }
        };

        // Wait a bit for GA4 to be ready if needed
        let attempts = 0;
        const maxAttempts = 20; // Increased attempts (2 seconds total)
        const checkGA4AndTrack = async () => {
          const gtag = (window as any).gtag;
          const dataLayer = (window as any).dataLayer;

          console.log('🔍 Checking GA4...', {
            attempt: attempts + 1,
            gtag: !!gtag,
            dataLayer: !!dataLayer,
            dataLayerLength: dataLayer?.length || 0,
          });

          if (typeof window !== 'undefined' && gtag) {
            console.log('✅ GA4 ready, tracking sign-up...');
            await sendServerSideSignupEvent();
            console.log('✅ GA4 sign-up event sent');
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(() => {
              void checkGA4AndTrack();
            }, 100);
          } else {
            console.warn(
              '⚠️ GA4 not available after waiting, trying to track anyway...'
            );
            // Try to track even if gtag isn't ready - it might queue in dataLayer
            if (dataLayer) {
              dataLayer.push({
                event: 'sign_up',
                method: signUpMethod,
                user_id: userId,
                event_id:
                  (crypto?.randomUUID && crypto.randomUUID()) ||
                  String(Date.now()),
              });
              await sendServerSideSignupEvent();
              console.log('✅ Sign-up event pushed to dataLayer');
            } else {
              console.error('❌ GA4 dataLayer not available');
            }
          }
        };

        void checkGA4AndTrack();

        // Store timestamp of tracking to prevent rapid duplicates
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            `signup_tracked_${userId}`,
            Date.now().toString()
          );
        }
        console.log('✅ Signup tracking complete (FB + GA)', {
          method: signUpMethod,
          userId,
        });
      } catch (err) {
        console.error('❌ Signup tracking failed:', err);
      } finally {
        // Give a small delay before redirecting to ensure events are sent
        setTimeout(() => {
          router.replace('/humanize');
        }, 500);
      }
    };

    void run();
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className='flex flex-col items-center justify-center h-screen text-white text-center px-4'>
      <h1 className='text-2xl font-semibold mb-2'>Welcome to KaloWrite 🎉</h1>
      <p className='text-zinc-400 max-w-md'>Preparing your workspace...</p>
    </div>
  );
}
