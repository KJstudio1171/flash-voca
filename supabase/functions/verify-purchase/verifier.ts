import type {
  VerifyPurchaseRequest,
  VerifyPurchaseResponse,
} from "./types.ts";
import { resolveBundleId } from "./bundleResolver.ts";
import { mapEntitlementResponse } from "./entitlementMapper.ts";
import { verifyGoogleReceipt } from "./googleReceiptVerifier.ts";
import { classifyProduct } from "./purchaseClassifier.ts";
import type { ProProductIds, VerifyDeps } from "./verificationDeps.ts";
import {
  assertReceiptUsableByUser,
  assertValidVerifyRequest,
  persistVerifiedPurchase,
} from "./verifierSteps.ts";
import { VerifyError } from "./verifyErrors.ts";

export type { ProProductIds, VerifyDeps } from "./verificationDeps.ts";
export { VerifyError } from "./verifyErrors.ts";

export async function verifyPurchase(
  req: VerifyPurchaseRequest,
  userId: string,
  deps: VerifyDeps,
  packageName = "",
  proProductIds: ProProductIds = { monthly: "", yearly: "", lifetime: "" },
): Promise<VerifyPurchaseResponse> {
  assertValidVerifyRequest(req);

  const classification = classifyProduct(req.productId, proProductIds);
  const bundleId = await resolveBundleId(req, deps, classification.isPro);

  await assertReceiptUsableByUser(deps, req.purchaseToken, userId);

  const receipt = await verifyGoogleReceipt(
    {
      packageName,
      productId: req.productId,
      purchaseToken: req.purchaseToken,
      isSubscription: classification.isSubscription,
    },
    deps,
  );

  const row = await persistVerifiedPurchase({
    deps,
    userId,
    bundleId,
    productId: req.productId,
    purchaseToken: req.purchaseToken,
    receipt,
  });

  return mapEntitlementResponse(row);
}
