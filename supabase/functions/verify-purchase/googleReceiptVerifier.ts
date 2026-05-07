import type { VerifyDeps } from "./verificationDeps.ts";
import { VerifyError } from "./verifyErrors.ts";

export interface VerifiedGoogleReceipt {
  kind: "one_time" | "subscription";
  expiresAt: string | null;
  autoRenewing: boolean;
  raw: unknown;
}

export async function verifyGoogleReceipt(
  input: {
    packageName: string;
    productId: string;
    purchaseToken: string;
    isSubscription: boolean;
  },
  deps: Pick<VerifyDeps, "getPlayPurchaseStatus" | "getSubscriptionStatus">,
): Promise<VerifiedGoogleReceipt> {
  if (input.isSubscription) {
    const sub = await deps.getSubscriptionStatus(
      input.packageName,
      input.purchaseToken,
    );
    if (
      sub.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE" &&
      sub.subscriptionState !== "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    ) {
      throw new VerifyError(422, "receipt_invalid");
    }

    return {
      kind: "subscription",
      expiresAt: sub.lineItems?.[0]?.expiryTime ?? null,
      autoRenewing: sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE",
      raw: sub.raw ?? sub,
    };
  }

  const status = await deps.getPlayPurchaseStatus(
    input.packageName,
    input.productId,
    input.purchaseToken,
  );
  if (status.purchaseState !== 0) {
    throw new VerifyError(422, "receipt_invalid");
  }

  return {
    kind: "one_time",
    expiresAt: null,
    autoRenewing: false,
    raw: status.raw ?? status,
  };
}
