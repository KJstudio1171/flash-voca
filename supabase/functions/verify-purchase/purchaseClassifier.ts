import type { ProProductIds } from "./verificationDeps.ts";

export interface ProductClassification {
  isPro: boolean;
  isSubscription: boolean;
}

export function classifyProduct(
  productId: string,
  proProductIds: ProProductIds,
): ProductClassification {
  const proIds = [
    proProductIds.monthly,
    proProductIds.yearly,
    proProductIds.lifetime,
  ].filter(Boolean);

  return {
    isPro: proIds.includes(productId),
    isSubscription:
      productId === proProductIds.monthly || productId === proProductIds.yearly,
  };
}
