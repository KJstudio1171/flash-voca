export interface VerifyPurchaseRequest {
  bundleId?: string;
  productId: string;
  purchaseToken: string;
}

export interface EntitlementRow {
  id: string;
  user_id: string;
  bundle_id: string;
  provider: string;
  provider_ref: string;
  status: string;
  granted_at: string;
  expires_at: string | null;
  synced_at: string | null;
  kind: string;
  auto_renewing: boolean;
}

export interface VerifyPurchaseResponse {
  entitlement: {
    id: string;
    userId: string;
    bundleId: string;
    provider: string;
    providerRef: string;
    status: string;
    grantedAt: string;
    expiresAt: string | null;
    syncedAt: string | null;
    kind: "one_time" | "subscription";
    autoRenewing: boolean;
  };
}
