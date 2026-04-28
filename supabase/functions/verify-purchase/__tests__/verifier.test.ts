import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyPurchase, VerifyDeps } from "../verifier.ts";

function createDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    findBundleById: async (id: string) =>
      id === "bundle_x" ? { play_product_id: "prod-1" } : null,
    findBundleByProductId: async (pid: string) =>
      pid === "prod-1" ? { id: "bundle_x" } : null,
    findReceiptByToken: async (_token: string) => null,
    upsertReceipt: async (_row) => {},
    upsertEntitlement: async (row) => ({
      id: "ent-1",
      user_id: row.user_id,
      bundle_id: row.bundle_id,
      provider: row.provider,
      provider_ref: row.provider_ref,
      status: "active",
      granted_at: "2026-04-28T00:00:00Z",
      expires_at: null,
      synced_at: null,
    }),
    getPlayPurchaseStatus: async () => ({ purchaseState: 0 }),
    ...overrides,
  };
}

Deno.test("verifyPurchase: happy path with bundleId", async () => {
  const deps = createDeps();
  const result = await verifyPurchase(
    { bundleId: "bundle_x", productId: "prod-1", purchaseToken: "t1" },
    "user-1",
    deps,
  );
  assertEquals(result.entitlement.bundleId, "bundle_x");
});

Deno.test("verifyPurchase: 403 on bundle_product_mismatch", async () => {
  const deps = createDeps({
    findBundleById: async () => ({ play_product_id: "different-prod" }),
  });
  await assertRejects(
    () =>
      verifyPurchase(
        { bundleId: "bundle_x", productId: "prod-1", purchaseToken: "t1" },
        "user-1",
        deps,
      ),
    Error,
    "bundle_product_mismatch",
  );
});

Deno.test("verifyPurchase: 404 when productId lookup fails", async () => {
  const deps = createDeps({ findBundleByProductId: async () => null });
  await assertRejects(
    () =>
      verifyPurchase(
        { productId: "prod-unknown", purchaseToken: "t1" },
        "user-1",
        deps,
      ),
    Error,
    "bundle_not_found",
  );
});

Deno.test("verifyPurchase: 409 when receipt belongs to another user", async () => {
  const deps = createDeps({
    findReceiptByToken: async () => ({ user_id: "other-user", status: "valid" }),
  });
  await assertRejects(
    () =>
      verifyPurchase(
        { bundleId: "bundle_x", productId: "prod-1", purchaseToken: "t1" },
        "user-1",
        deps,
      ),
    Error,
    "receipt_already_used",
  );
});

Deno.test("verifyPurchase: 422 when Google reports purchaseState != 0", async () => {
  const deps = createDeps({
    getPlayPurchaseStatus: async () => ({ purchaseState: 1 }),
  });
  await assertRejects(
    () =>
      verifyPurchase(
        { bundleId: "bundle_x", productId: "prod-1", purchaseToken: "t1" },
        "user-1",
        deps,
      ),
    Error,
    "receipt_invalid",
  );
});
