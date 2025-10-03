// lib/plans.ts
export function planFromPriceId(priceId?: string | null) {
  if (!priceId) return null;

  const mapping: Record<string, { name: string; quota: number }> = {
    [process.env.STRIPE_PRICE_BASIC_MONTHLY!]: { name: "basic", quota: 5000 },
    [process.env.STRIPE_PRICE_BASIC_YEARLY!]: { name: "basic", quota: 5000 },
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: { name: "pro", quota: 15000 },
    [process.env.STRIPE_PRICE_PRO_YEARLY!]: { name: "pro", quota: 15000 },
    [process.env.STRIPE_PRICE_ULTRA_MONTHLY!]: { name: "ultra", quota: 30000 },
    [process.env.STRIPE_PRICE_ULTRA_YEARLY!]: { name: "ultra", quota: 30000 },
  };

  return mapping[priceId] || null;
}
