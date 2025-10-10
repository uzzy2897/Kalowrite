"use client";

import { v4 as uuidv4 } from "uuid";

function getFbCookies() {
  const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];
  const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];
  return { fbp, fbc };
}
export async function trackSignup(email?: string) {
  try {
    const eventId = uuidv4();
    const { fbp, fbc } = getFbCookies();

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
    }

    await fetch("/api/fb/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        email,
        url: window?.location.href || "",
        fbp,
        fbc,
      }),
    });
  } catch (err) {
    console.error("FB signup tracking failed:", err);
  }
}
