// supabase/functions/pubsub-rtdn/types.ts
export interface SubscriptionNotification {
  version: string;
  notificationType: number;
  purchaseToken: string;
  subscriptionId: string;
}

export interface VoidedPurchaseNotification {
  purchaseToken: string;
  orderId: string;
  productType: number;
  refundType: number;
}

export interface RtdnPayload {
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: SubscriptionNotification;
  voidedPurchaseNotification?: VoidedPurchaseNotification;
  testNotification?: { version: string };
}

export interface ReceiptInfo {
  user_id: string;
  bundle_id?: string;
  provider: string;
}

export interface RtdnDeps {
  findReceiptByToken(token: string): Promise<ReceiptInfo | null>;
  getSubscriptionStatus(
    packageName: string,
    purchaseToken: string,
  ): Promise<{
    subscriptionState: string;
    lineItems?: { expiryTime?: string }[];
  }>;
  updateEntitlement(row: {
    user_id: string;
    bundle_id: string;
    provider: string;
    status: string;
    expires_at: string | null;
    auto_renewing: boolean;
  }): Promise<void>;
  updateReceiptStatus(token: string, status: string): Promise<void>;
  revokeEntitlementsByProviderRef(token: string): Promise<void>;
}

export type RtdnStatus =
  | "active"
  | "in_grace"
  | "on_hold"
  | "paused"
  | "cancelled"
  | "expired"
  | "revoked";

export function mapSubscriptionState(state: string): RtdnStatus {
  switch (state) {
    case "SUBSCRIPTION_STATE_ACTIVE": return "active";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD": return "in_grace";
    case "SUBSCRIPTION_STATE_ON_HOLD": return "on_hold";
    case "SUBSCRIPTION_STATE_PAUSED": return "paused";
    case "SUBSCRIPTION_STATE_CANCELED": return "cancelled";
    case "SUBSCRIPTION_STATE_EXPIRED": return "expired";
    case "SUBSCRIPTION_STATE_REVOKED": return "revoked";
    default: return "active";
  }
}
