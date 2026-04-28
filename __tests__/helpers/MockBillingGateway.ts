import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";

export function createMockBillingGateway(
  overrides: Partial<BillingGateway> = {},
): BillingGateway {
  return {
    initializeAsync: jest.fn().mockResolvedValue(undefined),
    fetchProductsAsync: jest.fn().mockResolvedValue([]),
    purchaseProductAsync: jest.fn().mockResolvedValue({
      productId: "prod-1",
      purchaseToken: "tok-1",
    }),
    finishPurchaseAsync: jest.fn().mockResolvedValue(undefined),
    queryActivePurchasesAsync: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}
