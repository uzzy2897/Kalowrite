// lib/ga/trackSignup.ts
export function trackSignupGA(email?: string) {
    if (typeof window === "undefined") return;
  
    // Ensure GA is loaded
    if (!(window as any).gtag) {
      console.warn("⚠️ GA not initialized yet");
      return;
    }
  
    // Use GA recommended event name "sign_up"
    (window as any).gtag("event", "sign_up", {
      method: "clerk_email", // adjust if you support Google OAuth
      user_email: email || "unknown",
      timestamp: new Date().toISOString(),
    });
  
    console.log("✅ Google Analytics signup event sent");
  }
  