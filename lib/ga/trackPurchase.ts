// lib/ga/trackPurchase.ts
export function trackPurchaseGA({
    transactionId,
    value,
    currency = "USD",
    items = [],
    coupon,
  }: {
    transactionId: string;
    value: number;
    currency?: string;
    items?: Array<{ item_id: string; item_name: string; price: number; quantity?: number }>;
    coupon?: string;
  }) {
    if (typeof window === "undefined") return;
    if (!(window as any).gtag) {
      console.warn("⚠️ GA not initialized yet");
      return;
    }
  
    (window as any).gtag("event", "purchase", {
      transaction_id: transactionId,
      value,
      currency,
      coupon,
      items,
    });
  
    console.log("✅ Google Analytics purchase event sent");
  }
  