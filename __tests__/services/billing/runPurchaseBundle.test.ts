import { runPurchaseBundleAsync } from "@/src/features/store/hooks/usePurchaseBundle";
import { createMockBillingGateway } from "@/__tests__/helpers/MockBillingGateway";
import { createMockPurchaseVerification } from "@/__tests__/helpers/MockPurchaseVerification";
import {
  BillingProductMissingError,
  AuthGateCancelledError,
} from "@/src/core/errors";
import type { Bundle } from "@/src/core/domain/models";

const sampleBundle: Bundle = {
  id: "bundle_x",
  title: "X",
  description: "",
  priceText: "$1",
  currencyCode: "USD",
  playProductId: "prod-1",
  coverColor: "#000",
  deckCount: 1,
  createdAt: "2026-04-28T00:00:00Z",
  updatedAt: "2026-04-28T00:00:00Z",
};

describe("runPurchaseBundleAsync", () => {
  it("runs gate -> purchase -> verify -> finish in order", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await runPurchaseBundleAsync(sampleBundle, {
      billingGateway: billing,
      purchaseVerification: verification,
      ensureLinkedAsync,
    });

    expect(ensureLinkedAsync).toHaveBeenCalled();
    expect(billing.purchaseProductAsync).toHaveBeenCalledWith("prod-1");
    expect(verification.verifyAsync).toHaveBeenCalledWith({
      bundleId: "bundle_x",
      productId: "prod-1",
      purchaseToken: "tok-1",
    });
    expect(billing.finishPurchaseAsync).toHaveBeenCalledWith("tok-1");
  });

  it("throws BillingProductMissingError when playProductId is null", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await expect(
      runPurchaseBundleAsync(
        { ...sampleBundle, playProductId: null },
        { billingGateway: billing, purchaseVerification: verification, ensureLinkedAsync },
      ),
    ).rejects.toBeInstanceOf(BillingProductMissingError);

    expect(ensureLinkedAsync).not.toHaveBeenCalled();
    expect(billing.purchaseProductAsync).not.toHaveBeenCalled();
  });

  it("does not call finishPurchaseAsync when verification fails", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification({
      verifyAsync: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await expect(
      runPurchaseBundleAsync(sampleBundle, {
        billingGateway: billing,
        purchaseVerification: verification,
        ensureLinkedAsync,
      }),
    ).rejects.toThrow();

    expect(billing.finishPurchaseAsync).not.toHaveBeenCalled();
  });

  it("does not start purchase when auth gate is cancelled", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest
      .fn()
      .mockRejectedValue(new AuthGateCancelledError());

    await expect(
      runPurchaseBundleAsync(sampleBundle, {
        billingGateway: billing,
        purchaseVerification: verification,
        ensureLinkedAsync,
      }),
    ).rejects.toBeInstanceOf(AuthGateCancelledError);

    expect(billing.purchaseProductAsync).not.toHaveBeenCalled();
  });
});
