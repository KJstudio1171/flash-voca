export interface BillingGateway {
  purchaseBundleAsync(bundleId: string): Promise<void>;
  restorePurchasesAsync(): Promise<void>;
}
