import { BillingVerificationError } from "@/src/core/errors";
import type { Entitlement } from "@/src/core/domain/models";

export class NoopPurchaseVerificationService {
  async verifyAsync(_input: {
    bundleId: string;
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    throw new BillingVerificationError({ context: { reason: "supabase_not_configured" } });
  }

  async verifyByProductIdAsync(_input: {
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    throw new BillingVerificationError({ context: { reason: "supabase_not_configured" } });
  }
}
