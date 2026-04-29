import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  handleSubscriptionNotification,
  handleVoidedPurchase,
} from "../notificationHandler.ts";
import type { RtdnDeps } from "../types.ts";

function createDeps(overrides: Partial<RtdnDeps> = {}): RtdnDeps & {
  calls: { name: string; args: unknown[] }[];
} {
  const calls: { name: string; args: unknown[] }[] = [];
  return {
    calls,
    findReceiptByToken: async (token) => {
      calls.push({ name: "findReceiptByToken", args: [token] });
      return { user_id: "user-1", provider: "google_play" };
    },
    getSubscriptionStatus: async (pkg, token) => {
      calls.push({ name: "getSubscriptionStatus", args: [pkg, token] });
      return {
        subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
        lineItems: [{ expiryTime: "2026-05-29T00:00:00.000Z" }],
      };
    },
    updateEntitlement: async (row) => {
      calls.push({ name: "updateEntitlement", args: [row] });
    },
    updateReceiptStatus: async (token, status) => {
      calls.push({ name: "updateReceiptStatus", args: [token, status] });
    },
    revokeEntitlementsByProviderRef: async (token) => {
      calls.push({ name: "revokeEntitlementsByProviderRef", args: [token] });
    },
    ...overrides,
  } as RtdnDeps & { calls: { name: string; args: unknown[] }[] };
}

Deno.test("handleSubscriptionNotification: ACTIVE -> status=active, autoRenewing=true", async () => {
  const deps = createDeps();
  await handleSubscriptionNotification(
    {
      packageName: "com.x",
      subscriptionNotification: {
        version: "1.0",
        notificationType: 4,
        purchaseToken: "tok-1",
        subscriptionId: "flashvoca_pro_monthly",
      },
    },
    deps,
  );
  const call = (deps as { calls: { name: string; args: unknown[] }[] }).calls.find(
    (c) => c.name === "updateEntitlement",
  );
  assertExists(call);
  const row = call!.args[0] as Record<string, unknown>;
  assertEquals(row.status, "active");
  assertEquals(row.auto_renewing, true);
  assertEquals(row.bundle_id, "pro");
});

Deno.test("handleSubscriptionNotification: CANCELED -> status=cancelled, autoRenewing=false", async () => {
  const deps = createDeps({
    getSubscriptionStatus: async () => ({
      subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
      lineItems: [{ expiryTime: "2026-05-29T00:00:00.000Z" }],
    }),
  });
  await handleSubscriptionNotification(
    {
      packageName: "com.x",
      subscriptionNotification: {
        version: "1.0",
        notificationType: 3,
        purchaseToken: "tok-2",
        subscriptionId: "flashvoca_pro_monthly",
      },
    },
    deps,
  );
  const call = (deps as { calls: { name: string; args: unknown[] }[] }).calls.find(
    (c) => c.name === "updateEntitlement",
  );
  const row = call!.args[0] as Record<string, unknown>;
  assertEquals(row.status, "cancelled");
  assertEquals(row.auto_renewing, false);
});

Deno.test("handleSubscriptionNotification: receipt not found -> no-op", async () => {
  const deps = createDeps({ findReceiptByToken: async () => null });
  await handleSubscriptionNotification(
    {
      packageName: "com.x",
      subscriptionNotification: {
        version: "1.0",
        notificationType: 4,
        purchaseToken: "tok-3",
        subscriptionId: "flashvoca_pro_monthly",
      },
    },
    deps,
  );
  const updateCalls = (deps as { calls: { name: string; args: unknown[] }[] }).calls.filter(
    (c) => c.name === "updateEntitlement",
  );
  assertEquals(updateCalls.length, 0);
});

Deno.test("handleVoidedPurchase: marks receipt refunded and revokes entitlements", async () => {
  const deps = createDeps();
  await handleVoidedPurchase(
    {
      voidedPurchaseNotification: {
        purchaseToken: "tok-4",
        orderId: "order-1",
        productType: 1,
        refundType: 1,
      },
    },
    deps,
  );
  const calls = (deps as { calls: { name: string; args: unknown[] }[] }).calls;
  assertExists(calls.find((c) => c.name === "updateReceiptStatus"));
  assertExists(calls.find((c) => c.name === "revokeEntitlementsByProviderRef"));
});

Deno.test("handleVoidedPurchase: receipt not found -> no-op", async () => {
  const deps = createDeps({ findReceiptByToken: async () => null });
  await handleVoidedPurchase(
    {
      voidedPurchaseNotification: {
        purchaseToken: "tok-5",
        orderId: "order-2",
        productType: 1,
        refundType: 1,
      },
    },
    deps,
  );
  const calls = (deps as { calls: { name: string; args: unknown[] }[] }).calls.filter(
    (c) => c.name === "updateReceiptStatus" || c.name === "revokeEntitlementsByProviderRef",
  );
  assertEquals(calls.length, 0);
});
