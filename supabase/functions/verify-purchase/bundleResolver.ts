import type { VerifyPurchaseRequest } from "./types.ts";
import type { VerifyDeps } from "./verificationDeps.ts";
import { VerifyError } from "./verifyErrors.ts";

export async function resolveBundleId(
  req: VerifyPurchaseRequest,
  deps: Pick<VerifyDeps, "findBundleById" | "findBundleByProductId">,
  isPro: boolean,
): Promise<string> {
  if (isPro) {
    if (req.bundleId && req.bundleId !== "pro") {
      throw new VerifyError(403, "bundle_product_mismatch");
    }
    return "pro";
  }

  if (req.bundleId) {
    const bundle = await deps.findBundleById(req.bundleId);
    if (!bundle) throw new VerifyError(404, "bundle_not_found");
    if (bundle.play_product_id !== req.productId) {
      throw new VerifyError(403, "bundle_product_mismatch");
    }
    return req.bundleId;
  }

  const bundle = await deps.findBundleByProductId(req.productId);
  if (!bundle) throw new VerifyError(404, "bundle_not_found");
  return bundle.id;
}
