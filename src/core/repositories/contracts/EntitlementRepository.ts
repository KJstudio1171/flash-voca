import { Entitlement } from "@/src/core/domain/models";

export interface EntitlementRepository {
  listActiveEntitlementsAsync(userId: string): Promise<Entitlement[]>;
  hasBundleAccessAsync(bundleId: string, userId: string): Promise<boolean>;
  replaceCachedEntitlementsAsync(userId: string, entitlements: Entitlement[]): Promise<void>;
  clearCachedEntitlementsAsync(userId: string): Promise<void>;
  upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void>;
}
