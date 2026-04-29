import { runPurchaseProAsync } from "@/src/features/billing/hooks/usePurchasePro";
import { createMockBillingGateway } from "@/__tests__/helpers/MockBillingGateway";
import { createMockPurchaseVerification } from "@/__tests__/helpers/MockPurchaseVerification";
import { AuthGateCancelledError } from "@/src/core/errors";

describe("runPurchaseProAsync", () => {
  it("runs gate -> purchase -> verify -> finish in order", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await runPurchaseProAsync("flashvoca_pro_monthly", {
      billingGateway: billing,
      purchaseVerification: verification,
      ensureLinkedAsync,
    });

    expect(ensureLinkedAsync).toHaveBeenCalled();
    expect(billing.purchaseProductAsync).toHaveBeenCalledWith("flashvoca_pro_monthly");
    expect(verification.verifyAsync).toHaveBeenCalledWith({
      bundleId: "pro",
      productId: "prod-1",
      purchaseToken: "tok-1",
    });
    expect(billing.finishPurchaseAsync).toHaveBeenCalledWith("tok-1");
  });

  it("does not call finishPurchase when verify fails", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification({
      verifyAsync: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await expect(
      runPurchaseProAsync("flashvoca_pro_monthly", {
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
    const ensureLinkedAsync = jest.fn().mockRejectedValue(new AuthGateCancelledError());

    await expect(
      runPurchaseProAsync("flashvoca_pro_monthly", {
        billingGateway: billing,
        purchaseVerification: verification,
        ensureLinkedAsync,
      }),
    ).rejects.toBeInstanceOf(AuthGateCancelledError);
    expect(billing.purchaseProductAsync).not.toHaveBeenCalled();
  });
});
