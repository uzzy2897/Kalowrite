"use client";
import { v4 as uuidv4 } from "uuid";

/* -------------------------------------------------------------------------- */
/* 📋 Helper: extract FB cookies (_fbp & _fbc)                                */
/* -------------------------------------------------------------------------- */
function getFbCookies() {
  const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];
  const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];
  return { fbp, fbc };
}

/* -------------------------------------------------------------------------- */
/* 📦 trackSignup() — send to Meta Pixel + CAPI                               */
/* -------------------------------------------------------------------------- */
export async function trackSignup(email?: string) {
  try {
    const eventId = uuidv4();
    const { fbp, fbc } = getFbCookies();

    // 🧭 1. Browser Pixel Event (for deduplication)
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
    }

    // 🧠 2. Server CAPI Event
    await fetch("/api/fb/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        email,
        url: window.location.href,
        fbp,
        fbc,
      }),
    });

    console.log("✅ Facebook signup event sent:", { eventId, email });
  } catch (err) {
    console.error("❌ FB signup tracking failed:", err);
  }
}
