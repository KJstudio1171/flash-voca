import { LOCAL_USER_ID } from "@/src/core/config/constants";
import { EntitlementRepository } from "@/src/core/repositories/contracts/EntitlementRepository";
import { RemoteEntitlementGateway } from "@/src/core/repositories/contracts/RemoteEntitlementGateway";
import { BillingGateway } from "@/src/core/services/billing/BillingGateway";

export class EntitlementService {
  constructor(
    private readonly entitlementRepository: EntitlementRepository,
    private readonly remoteGateway: RemoteEntitlementGateway,
    private readonly billingGateway: BillingGateway,
  ) {}

  listActiveEntitlementsAsync(userId = LOCAL_USER_ID) {
    return this.entitlementRepository.listActiveEntitlementsAsync(userId);
  }

  hasBundleAccessAsync(bundleId: string, userId = LOCAL_USER_ID) {
    return this.entitlementRepository.hasBundleAccessAsync(bundleId, userId);
  }

  async syncAsync(userId = LOCAL_USER_ID) {
    const remoteEntitlements = await this.remoteGateway.pullEntitlementsAsync(userId);
    await this.entitlementRepository.replaceCachedEntitlementsAsync(
      userId,
      remoteEntitlements,
    );
    return this.entitlementRepository.listActiveEntitlementsAsync(userId);
  }

  purchaseBundleAsync(bundleId: string) {
    return this.billingGateway.purchaseBundleAsync(bundleId);
  }

  restorePurchasesAsync() {
    return this.billingGateway.restorePurchasesAsync();
  }
}
