import type { ReceiptInfo, RtdnPayload } from "./types.ts";

export function resolveEntitlementBundleId(
  _payload: RtdnPayload,
  receipt: ReceiptInfo,
): string {
  return receipt.bundle_id ?? "pro";
}
