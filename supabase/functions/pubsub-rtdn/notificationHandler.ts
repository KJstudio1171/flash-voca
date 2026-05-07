// supabase/functions/pubsub-rtdn/notificationHandler.ts
import {
  RtdnDeps,
  RtdnPayload,
  mapSubscriptionState,
} from "./types.ts";
import { resolveEntitlementBundleId } from "./entitlementTarget.ts";

export async function handleSubscriptionNotification(
  payload: RtdnPayload,
  deps: RtdnDeps,
): Promise<void> {
  const noti = payload.subscriptionNotification;
  if (!noti) return;
  const receipt = await deps.findReceiptByToken(noti.purchaseToken);
  if (!receipt) return;

  const sub = await deps.getSubscriptionStatus(
    payload.packageName ?? "",
    noti.purchaseToken,
  );
  const status = mapSubscriptionState(sub.subscriptionState);
  const expiresAt = sub.lineItems?.[0]?.expiryTime ?? null;
  const autoRenewing = sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE";

  await deps.updateEntitlement({
    user_id: receipt.user_id,
    bundle_id: resolveEntitlementBundleId(payload, receipt),
    provider: "google_play",
    status,
    expires_at: expiresAt,
    auto_renewing: autoRenewing,
  });
}

export async function handleVoidedPurchase(
  payload: RtdnPayload,
  deps: RtdnDeps,
): Promise<void> {
  const noti = payload.voidedPurchaseNotification;
  if (!noti) return;
  const receipt = await deps.findReceiptByToken(noti.purchaseToken);
  if (!receipt) return;

  await deps.updateReceiptStatus(noti.purchaseToken, "refunded");
  await deps.revokeEntitlementsByProviderRef(noti.purchaseToken);
}
