import type { PurchaseVerificationService } from "@/src/core/services/billing/PurchaseVerificationService";
import type { Entitlement } from "@/src/core/domain/models";
import { TEST_USER_ID } from "./MockAuthService";

export function createMockEntitlement(
  overrides: Partial<Entitlement> = {},
): Entitlement {
  return {
    id: "ent-1",
    userId: TEST_USER_ID,
    bundleId: "bundle_x",
    provider: "google_play",
    providerRef: "tok-1",
    status: "active",
    grantedAt: "2026-04-28T00:00:00Z",
    expiresAt: null,
    syncedAt: null,
    kind: "one_time",
    autoRenewing: false,
    ...overrides,
  };
}

export function createMockPurchaseVerification(
  overrides: Partial<PurchaseVerificationService> = {},
): PurchaseVerificationService {
  return {
    verifyAsync: jest.fn().mockResolvedValue(createMockEntitlement()),
    verifyByProductIdAsync: jest.fn().mockResolvedValue(createMockEntitlement()),
    ...overrides,
  } as unknown as PurchaseVerificationService;
}
