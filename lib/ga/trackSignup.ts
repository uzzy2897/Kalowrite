// lib/ga/trackSignup.ts
export function trackSignupGA(opts?: { method?: string; userId?: string }) {
  if (typeof window === "undefined") return;

  const gtag = (window as any).gtag as
    | ((...args: any[]) => void)
    | undefined;

  if (!gtag) {
    console.warn("⚠️ GA not initialized yet");
    return;
  }

  // ⚠️ No PII. Don't send email, name, phone, etc.
  // GA4 recommended event name is "sign_up"
  gtag("event", "sign_up", {
    method: opts?.method ?? "clerk_email",
    // Optional: your internal non-PII user id (NOT an email)
    user_id: opts?.userId, // only if you set user_id consistently elsewhere too
    // Helps you see each fire distinctly in DebugView
    event_id: (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
    debug_mode: process.env.NODE_ENV !== "production",
  });

  // Optional: set user_id for the session (non-PII)
  if (opts?.userId) {
    gtag("set", { user_id: opts.userId });
  }

  console.log("✅ GA4 sign_up event sent");
}
