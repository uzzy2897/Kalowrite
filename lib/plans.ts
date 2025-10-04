// lib/plans.ts
export const PLAN_QUOTAS = {
  free: 500,
  basic: 5000,
  pro: 15000,
  ultra: 30000,
};

export const PRICE_IDS = {
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY!,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
  ultra: {
    monthly: process.env.STRIPE_PRICE_ULTRA_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_ULTRA_YEARLY!,
  },
};

// ✅ getPriceId(plan, billing)
export function getPriceId(plan: string, billing: "monthly" | "yearly") {
  return (PRICE_IDS as any)?.[plan]?.[billing] || null;
}

// ✅ planFromPriceId(priceId)
export function planFromPriceId(priceId?: string | null) {
  if (!priceId) return null;

  const mapping: Record<string, { name: string; quota: number }> = {
    [PRICE_IDS.basic.monthly]: { name: "basic", quota: PLAN_QUOTAS.basic },
    [PRICE_IDS.basic.yearly]: { name: "basic", quota: PLAN_QUOTAS.basic },
    [PRICE_IDS.pro.monthly]: { name: "pro", quota: PLAN_QUOTAS.pro },
    [PRICE_IDS.pro.yearly]: { name: "pro", quota: PLAN_QUOTAS.pro },
    [PRICE_IDS.ultra.monthly]: { name: "ultra", quota: PLAN_QUOTAS.ultra },
    [PRICE_IDS.ultra.yearly]: { name: "ultra", quota: PLAN_QUOTAS.ultra },
  };

  return mapping[priceId] || null;
}
