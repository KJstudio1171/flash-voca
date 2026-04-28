import {
  PurchaseVerificationService,
  PurchaseVerificationDeps,
} from "@/src/core/services/billing/PurchaseVerificationService";
import { BillingVerificationError } from "@/src/core/errors";
import { TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";
import type { Entitlement } from "@/src/core/domain/models";

function createDeps(overrides: Partial<PurchaseVerificationDeps> = {}): PurchaseVerificationDeps {
  return {
    invokeFunctionAsync: jest.fn(async () => ({
      data: {
        entitlement: {
          id: "ent-1",
          userId: TEST_USER_ID,
          bundleId: "bundle_x",
          provider: "google_play",
          providerRef: "tok-1",
          status: "active",
          grantedAt: "2026-04-28T00:00:00Z",
          expiresAt: null,
          syncedAt: null,
        } as Entitlement,
      },
    })),
    upsertCachedEntitlementAsync: jest.fn(async () => {}),
    ...overrides,
  };
}

describe("PurchaseVerificationService.verifyAsync", () => {
  it("invokes verify-purchase and updates the local cache", async () => {
    const deps = createDeps();
    const svc = new PurchaseVerificationService(deps);

    const ent = await svc.verifyAsync({
      bundleId: "bundle_x",
      productId: "prod-1",
      purchaseToken: "tok-1",
    });

    expect(deps.invokeFunctionAsync).toHaveBeenCalledWith("verify-purchase", {
      body: { bundleId: "bundle_x", productId: "prod-1", purchaseToken: "tok-1" },
    });
    expect(deps.upsertCachedEntitlementAsync).toHaveBeenCalledWith(ent);
    expect(ent.bundleId).toBe("bundle_x");
  });

  it("omits bundleId when only productId is provided (restore flow)", async () => {
    const deps = createDeps();
    const svc = new PurchaseVerificationService(deps);

    await svc.verifyByProductIdAsync({
      productId: "prod-1",
      purchaseToken: "tok-1",
    });

    expect(deps.invokeFunctionAsync).toHaveBeenCalledWith("verify-purchase", {
      body: { productId: "prod-1", purchaseToken: "tok-1" },
    });
  });

  it("maps Edge Function error to BillingVerificationError", async () => {
    const deps = createDeps({
      invokeFunctionAsync: jest.fn(async () => ({
        error: { message: "receipt_invalid" },
      })),
    });
    const svc = new PurchaseVerificationService(deps);

    await expect(
      svc.verifyAsync({ bundleId: "x", productId: "p", purchaseToken: "t" }),
    ).rejects.toBeInstanceOf(BillingVerificationError);
  });
});
