"use client";

import { v4 as uuidv4 } from "uuid";

export async function trackSignup(email?: string) {
  try {
    const eventId = uuidv4();

    // 1️⃣ Fire client-side Pixel (for dedup)
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
    }

    // 2️⃣ Send to your Next.js API (server-side CAPI)
    await fetch("/api/fb/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        email,
        url: typeof window !== "undefined" ? window.location.href : "",
      }),
    });
  } catch (err) {
    console.error("FB signup tracking failed:", err);
  }
}