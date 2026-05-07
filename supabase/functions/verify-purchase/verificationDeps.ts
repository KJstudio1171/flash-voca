import type { EntitlementRow } from "./types.ts";

export interface VerifyDeps {
  findBundleById(id: string): Promise<{ play_product_id: string | null } | null>;
  findBundleByProductId(productId: string): Promise<{ id: string } | null>;
  findReceiptByToken(
    token: string,
  ): Promise<{ user_id: string; status: string } | null>;
  upsertReceipt(row: {
    user_id: string;
    provider: string;
    product_id: string;
    purchase_token: string;
    raw_response: unknown;
    status: string;
  }): Promise<void>;
  upsertEntitlement(row: {
    user_id: string;
    bundle_id: string;
    provider: string;
    provider_ref: string;
    kind: "one_time" | "subscription";
    expires_at: string | null;
    auto_renewing: boolean;
  }): Promise<EntitlementRow>;
  getPlayPurchaseStatus(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<{ purchaseState: number; raw?: unknown }>;
  getSubscriptionStatus(
    packageName: string,
    purchaseToken: string,
  ): Promise<{
    subscriptionState: string;
    lineItems?: { expiryTime?: string }[];
    raw?: unknown;
  }>;
}

export interface ProProductIds {
  monthly: string;
  yearly: string;
  lifetime: string;
}
