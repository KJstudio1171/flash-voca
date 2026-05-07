import type { VerifyPurchaseRequest } from "./types.ts";
import type { VerifyDeps } from "./verificationDeps.ts";
import { VerifyError } from "./verifyErrors.ts";

export function assertValidVerifyRequest(req: VerifyPurchaseRequest): void {
  if (!req.productId || !req.purchaseToken) {
    throw new VerifyError(400, "invalid_request");
  }
}

export async function assertReceiptUsableByUser(
  deps: VerifyDeps,
  purchaseToken: string,
  userId: string,
): Promise<void> {
  const existing = await deps.findReceiptByToken(purchaseToken);
  if (existing && existing.user_id !== userId) {
    throw new VerifyError(409, "receipt_already_used");
  }
}

export async function persistVerifiedPurchase(input: {
  deps: VerifyDeps;
  userId: string;
  bundleId: string;
  productId: string;
  purchaseToken: string;
  receipt: {
    raw: unknown;
    kind: "one_time" | "subscription";
    expiresAt: string | null;
    autoRenewing: boolean;
  };
}) {
  await input.deps.upsertReceipt({
    user_id: input.userId,
    provider: "google_play",
    product_id: input.productId,
    purchase_token: input.purchaseToken,
    raw_response: input.receipt.raw,
    status: "valid",
  });

  return input.deps.upsertEntitlement({
    user_id: input.userId,
    bundle_id: input.bundleId,
    provider: "google_play",
    provider_ref: input.purchaseToken,
    kind: input.receipt.kind,
    expires_at: input.receipt.expiresAt,
    auto_renewing: input.receipt.autoRenewing,
  });
}
