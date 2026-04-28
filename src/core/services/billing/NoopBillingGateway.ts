import { BillingInitError } from "@/src/core/errors";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type {
  Product,
  PurchaseResult,
} from "@/src/core/services/billing/types";

export class NoopBillingGateway implements BillingGateway {
  async initializeAsync(): Promise<void> {}

  async fetchProductsAsync(_productIds: string[]): Promise<Product[]> {
    return [];
  }

  async purchaseProductAsync(_productId: string): Promise<PurchaseResult> {
    throw new BillingInitError({ context: { reason: "billing_not_configured" } });
  }

  async finishPurchaseAsync(_purchaseToken: string): Promise<void> {}

  async queryActivePurchasesAsync(): Promise<PurchaseResult[]> {
    return [];
  }
}
