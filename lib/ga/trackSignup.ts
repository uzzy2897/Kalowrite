// lib/ga/trackSignup.ts
import { ensureGaInitialized } from '@/lib/ga/initGa';

const GA_DEBUG_MODE =
  process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true' ||
  (process.env.NEXT_PUBLIC_GA_DEBUG_MODE === undefined &&
    process.env.NODE_ENV !== 'production');

export function trackSignupGA(opts?: { method?: string; userId?: string }) {
  if (typeof window === 'undefined') {
    console.warn('⚠️ trackSignupGA: window is undefined (server-side)');
    return;
  }

  const gaReady = ensureGaInitialized();

  if (!gaReady) {
    console.warn('⚠️ Unable to initialize GA before tracking sign_up event');
    return;
  }

  const gtag = (window as any).gtag as ((...args: any[]) => void) | undefined;

  if (!gtag) {
    console.warn('⚠️ GA not initialized yet - gtag function not found');
    console.warn('💡 Make sure cookies are accepted and GA4 script is loaded');
    return;
  }

  // ⚠️ No PII. Don't send email, name, phone, etc.
  // GA4 recommended event name is "sign_up"
  const eventParams = {
    method: opts?.method ?? 'clerk_email',
    // Optional: your internal non-PII user id (NOT an email)
    user_id: opts?.userId, // only if you set user_id consistently elsewhere too
    // Helps you see each fire distinctly in DebugView
    event_id: (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
    // Enable debug mode for development (shows in DebugView)
    debug_mode: GA_DEBUG_MODE,
    // Add timestamp for debugging
    timestamp: Date.now(),
  };

  console.log('📊 Sending GA4 sign_up event:', eventParams);

  try {
    gtag('event', 'sign_up', eventParams);

    // Optional: set user_id for the session (non-PII)
    if (opts?.userId) {
      gtag('set', { user_id: opts.userId });
      console.log('✅ User ID set for GA4 session:', opts.userId);
    }

    console.log('✅ GA4 sign_up event sent successfully');

    // Verify it was added to dataLayer
    const dataLayer = (window as any).dataLayer || [];
    console.log('📊 dataLayer length:', dataLayer.length);
    console.log('📊 Last dataLayer entry:', dataLayer[dataLayer.length - 1]);
  } catch (error) {
    console.error('❌ Error sending GA4 sign_up event:', error);
  }
}
