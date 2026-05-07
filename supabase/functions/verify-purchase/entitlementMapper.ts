import type { EntitlementRow, VerifyPurchaseResponse } from "./types.ts";

export function mapEntitlementResponse(
  row: EntitlementRow,
): VerifyPurchaseResponse {
  return {
    entitlement: {
      id: row.id,
      userId: row.user_id,
      bundleId: row.bundle_id,
      provider: row.provider,
      providerRef: row.provider_ref,
      status: row.status,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      syncedAt: row.synced_at,
      kind: row.kind === "subscription" ? "subscription" : "one_time",
      autoRenewing: Boolean(row.auto_renewing),
    },
  };
}
