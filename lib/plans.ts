// lib/plans.ts
export function planFromPriceId(priceId?: string) {
    if (!priceId) return null;
  
    if (priceId === process.env.STRIPE_PRICE_BASIC) {
      return { name: "basic", quota: 500 };
    }
    if (priceId === process.env.STRIPE_PRICE_PRO) {
      return { name: "pro", quota: 1500 };
    }
    if (priceId === process.env.STRIPE_PRICE_ULTRA) {
      return { name: "ultra", quota: 3000 };
    }
    return null;
  }
  