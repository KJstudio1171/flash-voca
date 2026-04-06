import { BillingGateway } from "@/src/core/services/billing/BillingGateway";

export class NoopBillingGateway implements BillingGateway {
  async purchaseBundleAsync() {
    throw new Error("Billing provider is not configured yet.");
  }

  async restorePurchasesAsync() {
    return Promise.resolve();
  }
}
