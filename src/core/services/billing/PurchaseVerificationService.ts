import { BillingVerificationError } from "@/src/core/errors";
import type { Entitlement } from "@/src/core/domain/models";

export interface PurchaseVerificationDeps {
  invokeFunctionAsync(
    name: string,
    options: { body: unknown },
  ): Promise<{ data?: { entitlement: Entitlement }; error?: unknown }>;
  upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void>;
}

export class PurchaseVerificationService {
  constructor(private readonly deps: PurchaseVerificationDeps) {}

  async verifyAsync(input: {
    bundleId: string;
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    return this.invoke({
      bundleId: input.bundleId,
      productId: input.productId,
      purchaseToken: input.purchaseToken,
    });
  }

  async verifyByProductIdAsync(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    return this.invoke({
      productId: input.productId,
      purchaseToken: input.purchaseToken,
    });
  }

  private async invoke(body: Record<string, unknown>): Promise<Entitlement> {
    const response = await this.deps.invokeFunctionAsync("verify-purchase", { body });
    if (response.error || !response.data) {
      throw new BillingVerificationError({ cause: response.error, context: { body } });
    }
    const entitlement = response.data.entitlement;
    await this.deps.upsertCachedEntitlementAsync(entitlement);
    return entitlement;
  }
}
