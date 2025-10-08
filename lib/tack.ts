export async function trackEvent({
    eventName,
    value,
    currency,
    user,
  }: {
    eventName: string;
    value?: number;
    currency?: string;
    user?: { email?: string };
  }) {
    const eventId = crypto.randomUUID();
  
    // Browser Pixel
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", eventName, {
        value,
        currency,
        event_id: eventId,
      });
    }
  
    // Server CAPI
    await fetch("/api/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        user,
        customData: { value, currency },
      }),
    });
  }
  