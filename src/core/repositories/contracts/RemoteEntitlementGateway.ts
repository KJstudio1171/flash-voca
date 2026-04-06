import { Entitlement } from "@/src/core/domain/models";

export interface RemoteEntitlementGateway {
  pullEntitlementsAsync(userId: string): Promise<Entitlement[]>;
}
