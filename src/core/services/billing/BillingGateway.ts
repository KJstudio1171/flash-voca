import type {
  Product,
  PurchaseResult,
} from "@/src/core/services/billing/types";

export interface BillingGateway {
  initializeAsync(): Promise<void>;
  fetchProductsAsync(productIds: string[]): Promise<Product[]>;
  purchaseProductAsync(productId: string): Promise<PurchaseResult>;
  finishPurchaseAsync(purchaseToken: string): Promise<void>;
  queryActivePurchasesAsync(): Promise<PurchaseResult[]>;
}
