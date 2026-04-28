import { EntitlementRepository } from "@/src/core/repositories/contracts/EntitlementRepository";
import { RemoteEntitlementGateway } from "@/src/core/repositories/contracts/RemoteEntitlementGateway";
import { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type { AuthService } from "@/src/core/services/auth/AuthService";

export class EntitlementService {
  constructor(
    private readonly entitlementRepository: EntitlementRepository,
    private readonly remoteGateway: RemoteEntitlementGateway,
    private readonly billingGateway: BillingGateway,
    private readonly auth: AuthService,
  ) {}

  listActiveEntitlementsAsync(userId?: string) {
    const id = userId ?? this.auth.getCurrentUserId();
    return this.entitlementRepository.listActiveEntitlementsAsync(id);
  }

  hasBundleAccessAsync(bundleId: string, userId?: string) {
    const id = userId ?? this.auth.getCurrentUserId();
    return this.entitlementRepository.hasBundleAccessAsync(bundleId, id);
  }

  async syncAsync(userId?: string) {
    const id = userId ?? this.auth.getCurrentUserId();
    const remoteEntitlements = await this.remoteGateway.pullEntitlementsAsync(id);
    await this.entitlementRepository.replaceCachedEntitlementsAsync(id, remoteEntitlements);
    return this.entitlementRepository.listActiveEntitlementsAsync(id);
  }

  purchaseBundleAsync(bundleId: string) {
    return this.billingGateway.purchaseBundleAsync(bundleId);
  }

  restorePurchasesAsync() {
    return this.billingGateway.restorePurchasesAsync();
  }
}
