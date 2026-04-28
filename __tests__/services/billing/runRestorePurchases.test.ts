import { runRestorePurchasesAsync } from "@/src/features/store/hooks/useRestorePurchases";
import { createMockBillingGateway } from "@/__tests__/helpers/MockBillingGateway";
import { createMockPurchaseVerification, createMockEntitlement } from "@/__tests__/helpers/MockPurchaseVerification";

describe("runRestorePurchasesAsync", () => {
  it("returns 0 restored when there are no active purchases", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();

    const summary = await runRestorePurchasesAsync({
      billingGateway: billing,
      purchaseVerification: verification,
    });

    expect(summary).toEqual({ totalAttempted: 0, restoredCount: 0 });
    expect(verification.verifyByProductIdAsync).not.toHaveBeenCalled();
  });

  it("verifies each active purchase and counts successes", async () => {
    const billing = createMockBillingGateway({
      queryActivePurchasesAsync: jest.fn().mockResolvedValue([
        { productId: "p1", purchaseToken: "t1" },
        { productId: "p2", purchaseToken: "t2" },
      ]),
    });
    const verification = createMockPurchaseVerification();

    const summary = await runRestorePurchasesAsync({
      billingGateway: billing,
      purchaseVerification: verification,
    });

    expect(verification.verifyByProductIdAsync).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ totalAttempted: 2, restoredCount: 2 });
  });

  it("counts only fulfilled when some verifications fail", async () => {
    const billing = createMockBillingGateway({
      queryActivePurchasesAsync: jest.fn().mockResolvedValue([
        { productId: "p1", purchaseToken: "t1" },
        { productId: "p2", purchaseToken: "t2" },
      ]),
    });
    const verification = createMockPurchaseVerification({
      verifyByProductIdAsync: jest
        .fn()
        .mockResolvedValueOnce(createMockEntitlement({ id: "ok" }))
        .mockRejectedValueOnce(new Error("boom")),
    });

    const summary = await runRestorePurchasesAsync({
      billingGateway: billing,
      purchaseVerification: verification,
    });

    expect(summary).toEqual({ totalAttempted: 2, restoredCount: 1 });
  });
});
