import type {
  VerifyPurchaseRequest,
  VerifyPurchaseResponse,
  EntitlementRow,
} from "./types.ts";

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

export class VerifyError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "VerifyError";
  }
}

export async function verifyPurchase(
  req: VerifyPurchaseRequest,
  userId: string,
  deps: VerifyDeps,
  packageName = "",
  proProductIds: ProProductIds = { monthly: "", yearly: "", lifetime: "" },
): Promise<VerifyPurchaseResponse> {
  if (!req.productId || !req.purchaseToken) {
    throw new VerifyError(400, "invalid_request");
  }

  const proIds = [
    proProductIds.monthly,
    proProductIds.yearly,
    proProductIds.lifetime,
  ].filter(Boolean);
  const isPro = proIds.includes(req.productId);
  const isSubs =
    req.productId === proProductIds.monthly ||
    req.productId === proProductIds.yearly;

  let bundleId: string;
  if (isPro) {
    if (req.bundleId && req.bundleId !== "pro") {
      throw new VerifyError(403, "bundle_product_mismatch");
    }
    bundleId = "pro";
  } else if (req.bundleId) {
    const bundle = await deps.findBundleById(req.bundleId);
    if (!bundle) throw new VerifyError(404, "bundle_not_found");
    if (bundle.play_product_id !== req.productId) {
      throw new VerifyError(403, "bundle_product_mismatch");
    }
    bundleId = req.bundleId;
  } else {
    const bundle = await deps.findBundleByProductId(req.productId);
    if (!bundle) throw new VerifyError(404, "bundle_not_found");
    bundleId = bundle.id;
  }

  const existing = await deps.findReceiptByToken(req.purchaseToken);
  if (existing && existing.user_id !== userId) {
    throw new VerifyError(409, "receipt_already_used");
  }

  let kind: "one_time" | "subscription" = "one_time";
  let expiresAt: string | null = null;
  let autoRenewing = false;
  let raw: unknown;

  if (isSubs) {
    kind = "subscription";
    const sub = await deps.getSubscriptionStatus(packageName, req.purchaseToken);
    raw = sub.raw ?? sub;
    if (
      sub.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE" &&
      sub.subscriptionState !== "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    ) {
      throw new VerifyError(422, "receipt_invalid");
    }
    expiresAt = sub.lineItems?.[0]?.expiryTime ?? null;
    autoRenewing = sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE";
  } else {
    const status = await deps.getPlayPurchaseStatus(
      packageName,
      req.productId,
      req.purchaseToken,
    );
    raw = status.raw ?? status;
    if (status.purchaseState !== 0) {
      throw new VerifyError(422, "receipt_invalid");
    }
  }

  await deps.upsertReceipt({
    user_id: userId,
    provider: "google_play",
    product_id: req.productId,
    purchase_token: req.purchaseToken,
    raw_response: raw,
    status: "valid",
  });

  const row = await deps.upsertEntitlement({
    user_id: userId,
    bundle_id: bundleId,
    provider: "google_play",
    provider_ref: req.purchaseToken,
    kind,
    expires_at: expiresAt,
    auto_renewing: autoRenewing,
  });

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
      kind: (row.kind === "subscription" ? "subscription" : "one_time"),
      autoRenewing: Boolean(row.auto_renewing),
    },
  };
}
