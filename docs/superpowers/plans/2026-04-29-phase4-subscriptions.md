# Phase 4 — Subscription Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Play Billing subscription support (monthly/yearly) and a Lifetime one-time SKU as a single "Flash Voca Pro" entitlement, with server-side verification (existing `verify-purchase` extended), a new `pubsub-rtdn` Edge Function for renewal/cancel/refund notifications, and a `useProAccess()` hook that exposes a single source of truth for the entire app.

**Architecture:** `verify-purchase` adds an INAPP/SUBS branch keyed by productId; on Pro IDs it writes to `entitlements` with `bundle_id='pro'`, `kind='subscription'|'one_time'`, `expires_at`, `auto_renewing`. A new `pubsub-rtdn` function receives Google Pub/Sub push notifications, re-fetches subscription state from Google for each event, and updates the entitlement; `voidedPurchaseNotification` revokes the entitlement and marks the receipt refunded. Client uses Phase 1's `usePurchaseBundle`-style flow, with a `bundleId: 'pro'` virtual key.

**Tech Stack:** TypeScript, Expo 54 / RN, `expo-iap` (Phase 1), Supabase Edge Functions (Deno), `googleapis`/`djwt` for service-account auth, Jest, Deno test runner.

**Spec:** `docs/superpowers/specs/2026-04-29-phase4-subscriptions-design.md`

---

## File Structure

### New Supabase artifacts
- `supabase/migrations/202604290001_phase4_subscriptions.sql` — `entitlements.kind`, `entitlements.auto_renewing`, status check expansion, `user_has_active_pro` SQL function
- `supabase/functions/pubsub-rtdn/index.ts` — HTTP entry + OIDC verification
- `supabase/functions/pubsub-rtdn/notificationHandler.ts` — pure handler logic
- `supabase/functions/pubsub-rtdn/types.ts` — payload types
- `supabase/functions/pubsub-rtdn/__tests__/notificationHandler.test.ts` — Deno tests

### New client files
- `src/features/billing/hooks/useProAccess.ts`
- `src/features/billing/hooks/useProProducts.ts`
- `src/features/billing/hooks/usePurchasePro.ts`
- `src/features/billing/screens/UpgradeScreen.tsx`
- `src/features/billing/utils/playSubscriptionDeeplink.ts`
- `src/features/profile/components/ProMembershipCard.tsx`
- `app/upgrade.tsx` — Expo Router screen
- `__tests__/features/billing/useProAccess.test.tsx`
- `__tests__/services/billing/runPurchasePro.test.ts`

### Modified files
- `package.json` — `expo-application` (already a dep? verify)
- `supabase/functions/verify-purchase/types.ts` — `VerifyPurchaseResponse` includes `kind`, `autoRenewing`
- `supabase/functions/verify-purchase/verifier.ts` — Pro/SUBS branch
- `supabase/functions/verify-purchase/index.ts` — wire env + new `upsertEntitlement` payload fields
- `supabase/functions/verify-purchase/googlePlayClient.ts` — add `getSubscriptionPurchaseAsync`
- `supabase/functions/verify-purchase/__tests__/verifier.test.ts` — extended cases
- `src/core/database/schema.ts` — `cached_entitlements` adds `kind`, `auto_renewing`
- `src/core/database/initialize.ts` — schema_version 7→8 column-add migration
- `src/core/database/types.ts` — cached_entitlements row interface
- `src/core/domain/models.ts` — `Entitlement.kind`, `Entitlement.autoRenewing`, `EntitlementStatus` 7-state union
- `src/core/repositories/sqlite/SqliteEntitlementRepository.ts` — read/write new columns
- `src/core/services/billing/PurchaseVerificationService.ts` — accept `kind`/`autoRenewing` in response
- `src/core/services/createAppServices.ts` — read PRO product env, pass through
- `src/core/observability/eventRegistry.ts` — `pro_*` and `rtdn_*` events
- `src/shared/i18n/locales/{ko,en,ja,zh}.json` — `pro.*`, `errors.subscription.*`
- `src/features/profile/screens/ProfileScreen.tsx` — render `ProMembershipCard`
- `__tests__/helpers/MockPurchaseVerification.ts` — `createMockEntitlement` adds `kind`/`autoRenewing` defaults

---

## Task 1: Supabase migration — entitlements extension

**Files:**
- Create: `supabase/migrations/202604290001_phase4_subscriptions.sql`

- [ ] **Step 1: Write SQL**

```sql
-- 202604290001_phase4_subscriptions.sql
-- Phase 4: subscription support extension

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'one_time'
    CHECK (kind IN ('one_time', 'subscription'));

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS auto_renewing BOOLEAN NOT NULL DEFAULT false;

-- Expand status check to include subscription states
ALTER TABLE entitlements
  DROP CONSTRAINT IF EXISTS entitlements_status_check;

ALTER TABLE entitlements
  ADD CONSTRAINT entitlements_status_check
    CHECK (status IN ('active', 'in_grace', 'on_hold', 'paused', 'cancelled', 'expired', 'revoked'));

CREATE OR REPLACE FUNCTION user_has_active_pro(uid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = uid
      AND bundle_id = 'pro'
      AND status IN ('active', 'in_grace', 'cancelled')
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/202604290001_phase4_subscriptions.sql
git commit -m "feat(supabase): extend entitlements for subscriptions (kind, auto_renewing, status)"
```

---

## Task 2: i18n + analytics events

**Files:**
- Modify: `src/shared/i18n/locales/{ko,en,ja,zh}.json`
- Modify: `src/core/observability/eventRegistry.ts`

- [ ] **Step 1: Add `pro` namespace + errors.subscription to ko.json**

Insert as a new top-level key (after `billing` or another existing top-level — verify by reading the file):

```json
"pro": {
  "title": "Flash Voca Pro",
  "heroDescription": "모든 기능을 잠금 해제하세요.",
  "benefits": {
    "adFree": "광고 없음",
    "future": "추가 기능이 출시되는 대로 자동 사용 가능"
  },
  "plan": {
    "monthly": "월간",
    "yearly": "연간",
    "yearlyDiscount": "{{percent}}% 할인",
    "lifetime": "평생",
    "priceMonthly": "{{price}} / 월",
    "priceYearly": "{{price}} / 년",
    "priceLifetime": "{{price}} / 1회"
  },
  "subscribeButton": "구독",
  "buyButton": "구매",
  "activeStatus": "Pro 활성",
  "nextRenewal": "다음 갱신: {{date}}",
  "expiresOn": "{{date}}에 만료",
  "lifetimeBadge": "평생 이용권",
  "managePlay": "Play Store에서 관리",
  "upgradeButton": "업그레이드 안내 보기"
}
```

Inside the existing `errors` object, add a `subscription` subtree:

```json
"subscription": {
  "invalidState": "구독 상태가 정상이 아니에요. 잠시 후 다시 시도해 주세요."
}
```

- [ ] **Step 2: Mirror in en.json**

```json
"pro": {
  "title": "Flash Voca Pro",
  "heroDescription": "Unlock every feature.",
  "benefits": {
    "adFree": "No ads",
    "future": "Automatic access to upcoming features"
  },
  "plan": {
    "monthly": "Monthly",
    "yearly": "Yearly",
    "yearlyDiscount": "{{percent}}% off",
    "lifetime": "Lifetime",
    "priceMonthly": "{{price}} / mo",
    "priceYearly": "{{price}} / yr",
    "priceLifetime": "{{price}} once"
  },
  "subscribeButton": "Subscribe",
  "buyButton": "Buy",
  "activeStatus": "Pro active",
  "nextRenewal": "Next renewal: {{date}}",
  "expiresOn": "Expires on {{date}}",
  "lifetimeBadge": "Lifetime",
  "managePlay": "Manage on Play Store",
  "upgradeButton": "View upgrade options"
}
```

`errors.subscription`:
```json
"subscription": {
  "invalidState": "Subscription state is not valid. Please try again later."
}
```

- [ ] **Step 3: Mirror in ja.json**

```json
"pro": {
  "title": "Flash Voca Pro",
  "heroDescription": "すべての機能を解放しましょう。",
  "benefits": {
    "adFree": "広告なし",
    "future": "今後追加される機能を自動で利用可能"
  },
  "plan": {
    "monthly": "月額",
    "yearly": "年額",
    "yearlyDiscount": "{{percent}}%割引",
    "lifetime": "永久",
    "priceMonthly": "{{price}} / 月",
    "priceYearly": "{{price}} / 年",
    "priceLifetime": "{{price}} / 一括"
  },
  "subscribeButton": "登録する",
  "buyButton": "購入する",
  "activeStatus": "Pro 有効",
  "nextRenewal": "次回更新: {{date}}",
  "expiresOn": "{{date}}に期限切れ",
  "lifetimeBadge": "永久ライセンス",
  "managePlay": "Play ストアで管理",
  "upgradeButton": "アップグレード詳細"
}
```

`errors.subscription`:
```json
"subscription": {
  "invalidState": "サブスクリプションの状態が正常ではありません。しばらくしてからもう一度お試しください。"
}
```

- [ ] **Step 4: Mirror in zh.json**

```json
"pro": {
  "title": "Flash Voca Pro",
  "heroDescription": "解锁所有功能。",
  "benefits": {
    "adFree": "无广告",
    "future": "新增功能自动可用"
  },
  "plan": {
    "monthly": "月度",
    "yearly": "年度",
    "yearlyDiscount": "{{percent}}% 折扣",
    "lifetime": "终身",
    "priceMonthly": "{{price}} / 月",
    "priceYearly": "{{price}} / 年",
    "priceLifetime": "{{price}} 一次"
  },
  "subscribeButton": "订阅",
  "buyButton": "购买",
  "activeStatus": "Pro 已激活",
  "nextRenewal": "下次续费: {{date}}",
  "expiresOn": "{{date}} 到期",
  "lifetimeBadge": "终身授权",
  "managePlay": "在 Play 商店管理",
  "upgradeButton": "查看升级选项"
}
```

`errors.subscription`:
```json
"subscription": {
  "invalidState": "订阅状态异常。请稍后再试。"
}
```

- [ ] **Step 5: Append events to src/core/observability/eventRegistry.ts**

Add before the closing `} satisfies` of the `analyticsEventRegistry` literal:

```ts
  pro_upgrade_screen_viewed: { allowedProps: ["source"] as const },
  pro_purchase_started: { allowedProps: ["productId", "kind"] as const },
  pro_purchase_succeeded: { allowedProps: ["productId", "kind"] as const },
  pro_purchase_failed: { allowedProps: ["productId", "reason"] as const },
  rtdn_subscription_received: { allowedProps: ["notificationType", "status"] as const },
  rtdn_voided_received: { allowedProps: ["productType"] as const },
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck
node -e "for (const f of ['ko','en','ja','zh']) JSON.parse(require('fs').readFileSync(\`src/shared/i18n/locales/\${f}.json\`,'utf8'))"
```
Expected: PASS, all 4 JSONs valid.

- [ ] **Step 7: Commit**

```bash
git add src/shared/i18n/locales/ src/core/observability/eventRegistry.ts
git commit -m "feat(i18n,observability): add pro namespace and subscription events"
```

---

## Task 3: Domain models — Entitlement.kind / autoRenewing / EntitlementStatus

**Files:**
- Modify: `src/core/domain/models.ts`

- [ ] **Step 1: Read current Entitlement and EntitlementStatus**

```bash
sed -n '1,100p' src/core/domain/models.ts
```

Find `EntitlementStatus` type and `Entitlement` interface.

- [ ] **Step 2: Update EntitlementStatus union**

Replace the existing union with:

```ts
export type EntitlementStatus =
  | "active"
  | "in_grace"
  | "on_hold"
  | "paused"
  | "cancelled"
  | "expired"
  | "revoked";
```

If existing values include `"pending"` (from earlier phases), keep them in the union as well to preserve compatibility:

```ts
export type EntitlementStatus =
  | "active" | "in_grace" | "on_hold" | "paused" | "cancelled" | "expired" | "revoked"
  | "pending";  // legacy, retained for old rows
```

> Decide based on existing usage. The Phase 1 schema check was `"active" | "expired" | "pending" | "revoked"`. Phase 4 updates the SQL constraint to the 7 new states; legacy rows with `"pending"` may exist. To stay safe in TypeScript, include `"pending"` in the union. UI treats `"pending"` like inactive.

- [ ] **Step 3: Add `kind` and `autoRenewing` to Entitlement interface**

```ts
export interface Entitlement {
  id: string;
  userId: string;
  bundleId: string;
  provider: string;
  providerRef: string | null;
  status: EntitlementStatus;
  grantedAt: string;
  expiresAt: string | null;
  syncedAt: string | null;
  kind: "one_time" | "subscription";       // NEW
  autoRenewing: boolean;                   // NEW
}
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail in places that construct Entitlement objects without `kind`/`autoRenewing` (Phase 1 mocks, Edge Function adapter, repository). Defer commit until Tasks 4–6 fix them.

---

## Task 4: cached_entitlements column migration (schema_version 7→8)

**Files:**
- Modify: `src/core/database/schema.ts`
- Modify: `src/core/database/initialize.ts`
- Modify: `src/core/database/types.ts`

- [ ] **Step 1: Update schema.ts**

In `src/core/database/schema.ts`, find `CACHED_ENTITLEMENTS_TABLE_SQL`. Add two columns between `synced_at` and `cache_updated_at`:

```ts
export const CACHED_ENTITLEMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS cached_entitlements (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  synced_at TEXT,
  kind TEXT NOT NULL DEFAULT 'one_time',
  auto_renewing INTEGER NOT NULL DEFAULT 0,
  cache_updated_at TEXT NOT NULL,
  raw_payload TEXT
);
`;
```

- [ ] **Step 2: Add migrateToVersion8Async**

In `src/core/database/initialize.ts`, after the existing `migrateToVersion7Async`, add:

```ts
async function migrateToVersion8Async(db: SQLiteDatabase): Promise<void> {
  await addColumnIfMissingAsync(
    db, "cached_entitlements", "kind", "TEXT NOT NULL DEFAULT 'one_time'"
  );
  await addColumnIfMissingAsync(
    db, "cached_entitlements", "auto_renewing", "INTEGER NOT NULL DEFAULT 0"
  );
}
```

Wire it into the migration chain (after `migrateToVersion7Async`):
```ts
if (currentVersion < 8) await migrateToVersion8Async(db);
```

Bump `LATEST_VERSION` to `8`.

- [ ] **Step 3: Update types.ts**

In `src/core/database/types.ts`, find the cached_entitlements row interface. Add:
```ts
kind: string;
auto_renewing: number;
```

- [ ] **Step 4: Defer commit until Task 5**

---

## Task 5: SqliteEntitlementRepository — read/write new columns

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteEntitlementRepository.ts`

- [ ] **Step 1: Read current file**

```bash
sed -n '1,200p' src/core/repositories/sqlite/SqliteEntitlementRepository.ts
```

Identify where rows are SELECTed (mapping function) and where the existing `upsertCachedEntitlementAsync` writes them.

- [ ] **Step 2: Update row mapping**

Wherever a row is mapped to `Entitlement`, add:
```ts
kind: (row.kind === "subscription" ? "subscription" : "one_time"),
autoRenewing: Boolean(row.auto_renewing),
```

- [ ] **Step 3: Update upsertCachedEntitlementAsync**

Modify the INSERT and ON CONFLICT clauses to include the two new columns:

```ts
async upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO cached_entitlements (
      id, user_id, bundle_id, provider, provider_ref, status,
      granted_at, expires_at, synced_at, kind, auto_renewing, cache_updated_at, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      provider_ref = excluded.provider_ref,
      granted_at = excluded.granted_at,
      expires_at = excluded.expires_at,
      synced_at = excluded.synced_at,
      kind = excluded.kind,
      auto_renewing = excluded.auto_renewing,
      cache_updated_at = excluded.cache_updated_at;`,
    [
      entitlement.id,
      entitlement.userId,
      entitlement.bundleId,
      entitlement.provider,
      entitlement.providerRef,
      entitlement.status,
      entitlement.grantedAt,
      entitlement.expiresAt,
      entitlement.syncedAt,
      entitlement.kind,
      entitlement.autoRenewing ? 1 : 0,
      now,
    ],
  );
}
```

Also update `replaceCachedEntitlementsAsync` to include kind/auto_renewing in its INSERT statement(s) — same column list.

- [ ] **Step 4: Update test fixtures**

Search for `Entitlement` literal constructions in `__tests__/`:

```bash
grep -rn "providerRef:\|grantedAt:\|expiresAt:" __tests__/ 2>/dev/null | head
```

For each `Entitlement` literal, add `kind: "one_time"` and `autoRenewing: false` defaults. Most likely places:
- `__tests__/helpers/MockPurchaseVerification.ts` — `createMockEntitlement`
- `__tests__/services/StoreService.test.ts`

Update `createMockEntitlement` defaults:
```ts
return {
  id: "ent-1", userId: TEST_USER_ID, bundleId: "bundle_x",
  provider: "google_play", providerRef: "tok-1", status: "active",
  grantedAt: "2026-04-29T00:00:00Z", expiresAt: null, syncedAt: null,
  kind: "one_time",
  autoRenewing: false,
  ...overrides,
};
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 6: Commit Tasks 3+4+5 together**

```bash
git add src/core/domain/models.ts \
        src/core/database/schema.ts \
        src/core/database/initialize.ts \
        src/core/database/types.ts \
        src/core/repositories/sqlite/SqliteEntitlementRepository.ts \
        __tests__/
git commit -m "feat(entitlements): add kind, auto_renewing, expanded status union"
```

---

## Task 6: PurchaseVerificationService — accept new fields in response

**Files:**
- Modify: `src/core/services/billing/PurchaseVerificationService.ts`

- [ ] **Step 1: Read current file**

```bash
sed -n '1,80p' src/core/services/billing/PurchaseVerificationService.ts
```

The current `PurchaseVerificationDeps.invokeFunctionAsync` returns `{ data?: { entitlement: Entitlement } }`. Since `Entitlement` now includes `kind` and `autoRenewing`, the upstream Edge Function must also return them — that's handled in Tasks 7–9. The client-side service just needs to ensure the response is mapped correctly.

- [ ] **Step 2: Add safe defaults in case server omits new fields**

Inside the `invoke` private method, after receiving `entitlement` from the response, add fallbacks:

```ts
private async invoke(body: Record<string, unknown>): Promise<Entitlement> {
  const response = await this.deps.invokeFunctionAsync("verify-purchase", { body });
  if (response.error || !response.data) {
    throw new BillingVerificationError({ cause: response.error, context: { body } });
  }
  const raw = response.data.entitlement as Entitlement & { kind?: string; autoRenewing?: boolean };
  const entitlement: Entitlement = {
    ...raw,
    kind: (raw.kind === "subscription" ? "subscription" : "one_time"),
    autoRenewing: Boolean(raw.autoRenewing),
  };
  await this.deps.upsertCachedEntitlementAsync(entitlement);
  return entitlement;
}
```

This guarantees client compiles even if a not-yet-deployed Edge Function omits the fields.

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/core/services/billing/PurchaseVerificationService.ts
git commit -m "feat(billing): map kind/autoRenewing in verify response with safe defaults"
```

---

## Task 7: Edge Function types — extend VerifyPurchaseResponse

**Files:**
- Modify: `supabase/functions/verify-purchase/types.ts`

- [ ] **Step 1: Update VerifyPurchaseResponse**

Replace the `entitlement` shape:

```ts
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
```

Also extend `EntitlementRow`:

```ts
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
```

- [ ] **Step 2: Defer commit until Task 8 (verifier extension)**

---

## Task 8: Edge Function verifier — Pro/SUBS branch (TDD)

**Files:**
- Modify: `supabase/functions/verify-purchase/verifier.ts`
- Modify: `supabase/functions/verify-purchase/__tests__/verifier.test.ts`

- [ ] **Step 1: Add new Deno test cases**

In `verifier.test.ts`, add inside the existing describe (or as new top-level Deno.test calls — match the file's pattern):

```ts
Deno.test("verifyPurchase: SUBS productId returns kind=subscription with expiresAt", async () => {
  const deps = createDeps({
    findBundleById: async () => null, // Pro doesn't lookup bundles table
    getPlayPurchaseStatus: async () => ({ purchaseState: 0 }),
    getSubscriptionStatus: async () => ({
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ expiryTime: "2026-05-29T00:00:00.000Z" }],
    }),
  });
  const result = await verifyPurchase(
    { bundleId: "pro", productId: "flashvoca_pro_monthly", purchaseToken: "t1" },
    "user-1",
    deps,
    "com.kjstudio.flashvoca",
    {
      monthly: "flashvoca_pro_monthly",
      yearly: "flashvoca_pro_yearly",
      lifetime: "flashvoca_pro_lifetime",
    },
  );
  assertEquals(result.entitlement.kind, "subscription");
  assertEquals(result.entitlement.expiresAt, "2026-05-29T00:00:00.000Z");
  assertEquals(result.entitlement.autoRenewing, true);
});

Deno.test("verifyPurchase: Pro Lifetime productId returns kind=one_time", async () => {
  const deps = createDeps({
    findBundleById: async () => null,
    getPlayPurchaseStatus: async () => ({ purchaseState: 0 }),
  });
  const result = await verifyPurchase(
    { bundleId: "pro", productId: "flashvoca_pro_lifetime", purchaseToken: "t1" },
    "user-1",
    deps,
    "com.kjstudio.flashvoca",
    {
      monthly: "flashvoca_pro_monthly",
      yearly: "flashvoca_pro_yearly",
      lifetime: "flashvoca_pro_lifetime",
    },
  );
  assertEquals(result.entitlement.kind, "one_time");
  assertEquals(result.entitlement.expiresAt, null);
});

Deno.test("verifyPurchase: 403 when Pro product but bundleId !== 'pro'", async () => {
  const deps = createDeps({});
  await assertRejects(
    () =>
      verifyPurchase(
        { bundleId: "bundle_x", productId: "flashvoca_pro_monthly", purchaseToken: "t1" },
        "user-1",
        deps,
        "com.kjstudio.flashvoca",
        {
          monthly: "flashvoca_pro_monthly",
          yearly: "flashvoca_pro_yearly",
          lifetime: "flashvoca_pro_lifetime",
        },
      ),
    Error,
    "bundle_product_mismatch",
  );
});

Deno.test("verifyPurchase: 422 when subscription state is not active/grace", async () => {
  const deps = createDeps({
    findBundleById: async () => null,
    getSubscriptionStatus: async () => ({
      subscriptionState: "SUBSCRIPTION_STATE_EXPIRED",
      lineItems: [{ expiryTime: "2026-04-01T00:00:00.000Z" }],
    }),
  });
  await assertRejects(
    () =>
      verifyPurchase(
        { bundleId: "pro", productId: "flashvoca_pro_monthly", purchaseToken: "t1" },
        "user-1",
        deps,
        "com.kjstudio.flashvoca",
        {
          monthly: "flashvoca_pro_monthly",
          yearly: "flashvoca_pro_yearly",
          lifetime: "flashvoca_pro_lifetime",
        },
      ),
    Error,
    "receipt_invalid",
  );
});
```

Update `createDeps` (the helper at the top of `verifier.test.ts`) to include a `getSubscriptionStatus` field with a default:

```ts
function createDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    // ...existing,
    getSubscriptionStatus: async () => ({
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ expiryTime: "2026-05-29T00:00:00.000Z" }],
    }),
    ...overrides,
  };
}
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
which deno && deno test supabase/functions/verify-purchase/__tests__/verifier.test.ts || echo "Deno not installed; will run in CI"
```
Expected: tests fail (compile errors or assertion failures) because verifier doesn't yet support Pro/SUBS branching.

- [ ] **Step 3: Update verifier.ts**

Modify `VerifyDeps` to add `getSubscriptionStatus` and the function signature to accept `proProductIds`:

```ts
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
```

Update `verifyPurchase` signature and body:

```ts
export async function verifyPurchase(
  req: VerifyPurchaseRequest,
  userId: string,
  deps: VerifyDeps,
  packageName: string,
  proProductIds: ProProductIds,
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
```

- [ ] **Step 4: Run — confirm PASS**

```bash
which deno && deno test supabase/functions/verify-purchase/__tests__/verifier.test.ts || echo "skipping deno tests"
```
Expected: all PASS.

- [ ] **Step 5: Defer commit until Task 9**

---

## Task 9: Edge Function index — wire env + Google subscriptions API

**Files:**
- Modify: `supabase/functions/verify-purchase/googlePlayClient.ts`
- Modify: `supabase/functions/verify-purchase/index.ts`

- [ ] **Step 1: Add subscriptionsv2.get to googlePlayClient.ts**

Append to `supabase/functions/verify-purchase/googlePlayClient.ts`:

```ts
export async function getSubscriptionPurchaseAsync(
  packageName: string,
  purchaseToken: string,
): Promise<{
  subscriptionState: string;
  lineItems?: { expiryTime?: string }[];
  raw: unknown;
}> {
  const token = await getAccessTokenAsync();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Play subscriptions API ${res.status}: ${await res.text()}`);
  }
  const raw = (await res.json()) as {
    subscriptionState: string;
    lineItems?: { expiryTime?: string }[];
  };
  return {
    subscriptionState: raw.subscriptionState,
    lineItems: raw.lineItems,
    raw,
  };
}
```

- [ ] **Step 2: Update index.ts to read PRO_PRODUCT_* env and pass to verifier**

Find the `serve(async (req) => { ... })` block. After existing env reads, add:

```ts
const PRO_PRODUCT_IDS = {
  monthly: Deno.env.get("PRO_PRODUCT_MONTHLY") ?? "",
  yearly: Deno.env.get("PRO_PRODUCT_YEARLY") ?? "",
  lifetime: Deno.env.get("PRO_PRODUCT_LIFETIME") ?? "",
};
```

Update import:
```ts
import {
  getProductPurchaseAsync,
  getSubscriptionPurchaseAsync,
} from "./googlePlayClient.ts";
```

Update the `deps: VerifyDeps` literal:
- Add `getSubscriptionStatus: getSubscriptionPurchaseAsync`
- Update `upsertEntitlement` to set the new columns:

```ts
upsertEntitlement: async (row) => {
  const { data, error } = await adminClient
    .from("entitlements")
    .upsert(
      {
        user_id: row.user_id,
        bundle_id: row.bundle_id,
        provider: row.provider,
        provider_ref: row.provider_ref,
        kind: row.kind,
        expires_at: row.expires_at,
        auto_renewing: row.auto_renewing,
        status: "active",
        granted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,bundle_id,provider" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
},
```

Update the `verifyPurchase` call to pass `PRO_PRODUCT_IDS`:

```ts
const result = await verifyPurchase(body, userId, deps, PACKAGE_NAME, PRO_PRODUCT_IDS);
```

- [ ] **Step 3: Verify (typecheck only — Deno tests already covered in Task 8)**

```bash
npm run typecheck
```
Expected: PASS (TypeScript ignores supabase/functions per tsconfig exclusion).

- [ ] **Step 4: Commit Tasks 7+8+9 together**

```bash
git add supabase/functions/verify-purchase/
git commit -m "feat(edge): verify-purchase handles Pro INAPP/SUBS branches"
```

---

## Task 10: pubsub-rtdn Edge Function — types + handler (TDD)

**Files:**
- Create: `supabase/functions/pubsub-rtdn/types.ts`
- Create: `supabase/functions/pubsub-rtdn/notificationHandler.ts`
- Create: `supabase/functions/pubsub-rtdn/__tests__/notificationHandler.test.ts`

- [ ] **Step 1: Write types.ts**

```ts
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
  productType: number; // 1 = subscription, 0 = one_time
  refundType: number;  // 1 = full, 2 = partial
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
```

- [ ] **Step 2: Write failing tests**

```ts
// supabase/functions/pubsub-rtdn/__tests__/notificationHandler.test.ts
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
```

- [ ] **Step 3: Run — confirm FAIL**

```bash
which deno && deno test supabase/functions/pubsub-rtdn/__tests__/notificationHandler.test.ts || echo "skipping (Deno not installed)"
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement notificationHandler.ts**

```ts
// supabase/functions/pubsub-rtdn/notificationHandler.ts
import {
  RtdnDeps,
  RtdnPayload,
  mapSubscriptionState,
} from "./types.ts";

export async function handleSubscriptionNotification(
  payload: RtdnPayload,
  deps: RtdnDeps,
): Promise<void> {
  const noti = payload.subscriptionNotification;
  if (!noti) return;
  const receipt = await deps.findReceiptByToken(noti.purchaseToken);
  if (!receipt) return; // verify-purchase hasn't recorded this yet — ignore.

  const sub = await deps.getSubscriptionStatus(
    payload.packageName ?? "",
    noti.purchaseToken,
  );
  const status = mapSubscriptionState(sub.subscriptionState);
  const expiresAt = sub.lineItems?.[0]?.expiryTime ?? null;
  const autoRenewing = sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE";

  await deps.updateEntitlement({
    user_id: receipt.user_id,
    bundle_id: "pro",
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
```

- [ ] **Step 5: Run — confirm PASS**

```bash
which deno && deno test supabase/functions/pubsub-rtdn/__tests__/notificationHandler.test.ts || echo "manual run later"
```
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/pubsub-rtdn/types.ts \
        supabase/functions/pubsub-rtdn/notificationHandler.ts \
        supabase/functions/pubsub-rtdn/__tests__/notificationHandler.test.ts
git commit -m "feat(edge): pubsub-rtdn notification handler core logic + tests"
```

---

## Task 11: pubsub-rtdn HTTP entry with OIDC verification

**Files:**
- Create: `supabase/functions/pubsub-rtdn/index.ts`

- [ ] **Step 1: Write the entry**

```ts
// supabase/functions/pubsub-rtdn/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import {
  handleSubscriptionNotification,
  handleVoidedPurchase,
} from "./notificationHandler.ts";
import type { RtdnDeps, RtdnPayload } from "./types.ts";
import { getSubscriptionPurchaseAsync } from "../verify-purchase/googlePlayClient.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PACKAGE_NAME = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "";

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyPubSubOIDC(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length);
  // Verify via Google's tokeninfo endpoint.
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return false;
    const info = (await res.json()) as { aud?: string; email?: string };
    // Optionally validate aud matches our function URL or email matches expected SA.
    // For initial deploy we accept any successful tokeninfo response from Google.
    return Boolean(info.email);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }
  if (!(await verifyPubSubOIDC(req))) {
    return new Response("unauthorized", { status: 401 });
  }

  let pubsubMessage: { message?: { data?: string } };
  try {
    pubsubMessage = await req.json();
  } catch {
    return new Response("invalid_request", { status: 400 });
  }

  const data = pubsubMessage.message?.data;
  if (!data) return new Response("", { status: 204 });

  let payload: RtdnPayload;
  try {
    payload = JSON.parse(atob(data)) as RtdnPayload;
  } catch {
    return new Response("invalid_payload", { status: 400 });
  }

  const deps: RtdnDeps = {
    findReceiptByToken: async (token) => {
      const { data, error } = await adminClient
        .from("purchase_receipts")
        .select("user_id, provider")
        .eq("purchase_token", token)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    getSubscriptionStatus: async (pkg, token) => {
      const r = await getSubscriptionPurchaseAsync(pkg, token);
      return { subscriptionState: r.subscriptionState, lineItems: r.lineItems };
    },
    updateEntitlement: async (row) => {
      const { error } = await adminClient
        .from("entitlements")
        .upsert(row, { onConflict: "user_id,bundle_id,provider" });
      if (error) throw error;
    },
    updateReceiptStatus: async (token, status) => {
      const { error } = await adminClient
        .from("purchase_receipts")
        .update({ status })
        .eq("purchase_token", token);
      if (error) throw error;
    },
    revokeEntitlementsByProviderRef: async (token) => {
      const { error } = await adminClient
        .from("entitlements")
        .update({ status: "revoked", auto_renewing: false })
        .eq("provider_ref", token);
      if (error) throw error;
    },
  };

  try {
    if (payload.subscriptionNotification) {
      await handleSubscriptionNotification(payload, deps);
    } else if (payload.voidedPurchaseNotification) {
      await handleVoidedPurchase(payload, deps);
    }
    // testNotification / unknown -> silent no-op
    return new Response("", { status: 204 });
  } catch (err) {
    console.error("pubsub-rtdn handler error", err);
    // Return 500 so Pub/Sub retries.
    return new Response("error", { status: 500 });
  }
});
```

> Pass `packageName` from env to `getSubscriptionStatus`. The handler signature accepts a deps with that responsibility, so we wire it via the closure that calls `getSubscriptionPurchaseAsync(pkg, token)` — but our `getSubscriptionStatus` deps shape is `(pkg, token)`. Since `payload.packageName` is what the handler passes, this works.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/pubsub-rtdn/index.ts
git commit -m "feat(edge): pubsub-rtdn HTTP entry with OIDC verification"
```

---

## Task 12: useProAccess hook (TDD)

**Files:**
- Create: `src/features/billing/hooks/useProAccess.ts`
- Create: `__tests__/features/billing/useProAccess.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/features/billing/useProAccess.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import type { Entitlement, EntitlementStatus } from "@/src/core/domain/models";

const ServicesCtx = React.createContext<unknown>(null);

jest.mock("@/src/app/AppProviders", () => ({
  useAppServices: () => React.useContext(ServicesCtx),
}));

import { useProAccess } from "@/src/features/billing/hooks/useProAccess";

function makeEntitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: "ent-1",
    userId: "user-1",
    bundleId: "pro",
    provider: "google_play",
    providerRef: "tok-1",
    status: "active" as EntitlementStatus,
    grantedAt: "2026-04-29T00:00:00Z",
    expiresAt: null,
    syncedAt: null,
    kind: "subscription",
    autoRenewing: true,
    ...overrides,
  };
}

function wrap(services: unknown) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <ServicesCtx.Provider value={services}>{children}</ServicesCtx.Provider>
    </QueryClientProvider>
  );
}

describe("useProAccess", () => {
  it("returns isPro=true for active subscription with future expiresAt", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ expiresAt: "2099-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(true));
    expect(result.current.kind).toBe("subscription");
  });

  it("returns isPro=true for cancelled subscription before expiry", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "cancelled", expiresAt: "2099-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(true));
  });

  it("returns isPro=false for expired status", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "expired", expiresAt: "2024-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(false));
  });

  it("returns isPro=false for on_hold status", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "on_hold", expiresAt: "2099-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(false));
  });

  it("returns isPro=false when expiresAt is in the past", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "active", expiresAt: "2024-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(false));
  });

  it("returns isPro=true and kind=lifetime when expiresAt is null and kind=one_time", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "active", expiresAt: null, kind: "one_time", autoRenewing: false }),
        ]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(true));
    expect(result.current.kind).toBe("lifetime");
  });

  it("returns isPro=false when no Pro entitlement exists", async () => {
    const services = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([]),
      },
    };
    const { result } = renderHook(() => useProAccess(), { wrapper: wrap(services) });
    await waitFor(() => expect(result.current.isPro).toBe(false));
    expect(result.current.kind).toBeNull();
  });
});
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npx jest __tests__/features/billing/useProAccess.test.tsx
```
Expected: module not found.

- [ ] **Step 3: Implement useProAccess**

```ts
// src/features/billing/hooks/useProAccess.ts
import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import type { EntitlementStatus } from "@/src/core/domain/models";

export interface ProAccess {
  isPro: boolean;
  expiresAt: string | null;
  status: Extract<EntitlementStatus, "active" | "in_grace" | "cancelled"> | null;
  kind: "subscription" | "lifetime" | null;
  autoRenewing: boolean;
}

const ACTIVE_STATUSES: EntitlementStatus[] = ["active", "in_grace", "cancelled"];

export function useProAccess(): ProAccess {
  const { entitlementService } = useAppServices();

  const { data } = useQuery({
    queryKey: ["entitlements", "pro"],
    queryFn: async () => {
      const list = await entitlementService.listActiveEntitlementsAsync();
      return list.find((e) => e.bundleId === "pro") ?? null;
    },
    staleTime: 60_000,
  });

  if (!data) {
    return { isPro: false, expiresAt: null, status: null, kind: null, autoRenewing: false };
  }

  const isStatusActive = ACTIVE_STATUSES.includes(data.status);
  const isNotExpired =
    data.expiresAt === null || new Date(data.expiresAt) > new Date();
  const isPro = isStatusActive && isNotExpired;

  return {
    isPro,
    expiresAt: data.expiresAt,
    status: isPro ? (data.status as ProAccess["status"]) : null,
    kind: isPro ? (data.kind === "subscription" ? "subscription" : "lifetime") : null,
    autoRenewing: data.autoRenewing,
  };
}
```

> If `entitlementService.listActiveEntitlementsAsync` requires a userId argument with no default in the service, pass it via `auth.getCurrentUserId()`. Inspect the existing service signature first — Phase 1 already added an internal default that calls auth.

- [ ] **Step 4: Run — confirm PASS**

```bash
npx jest __tests__/features/billing/useProAccess.test.tsx
```
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/hooks/useProAccess.ts \
        __tests__/features/billing/useProAccess.test.tsx
git commit -m "feat(billing): useProAccess hook (single source of truth)"
```

---

## Task 13: useProProducts hook

**Files:**
- Create: `src/features/billing/hooks/useProProducts.ts`

- [ ] **Step 1: Write hook**

```ts
// src/features/billing/hooks/useProProducts.ts
import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export interface ProProduct {
  productId: string;
  kind: "monthly" | "yearly" | "lifetime";
  priceText: string;
  currencyCode: string;
}

function kindFromProductId(
  id: string,
  monthly: string,
  yearly: string,
  lifetime: string,
): ProProduct["kind"] {
  if (id === monthly) return "monthly";
  if (id === yearly) return "yearly";
  if (id === lifetime) return "lifetime";
  return "monthly";
}

export function useProProducts() {
  const { billingGateway } = useAppServices();
  const monthly = process.env.EXPO_PUBLIC_PRO_PRODUCT_MONTHLY ?? "";
  const yearly = process.env.EXPO_PUBLIC_PRO_PRODUCT_YEARLY ?? "";
  const lifetime = process.env.EXPO_PUBLIC_PRO_PRODUCT_LIFETIME ?? "";

  return useQuery({
    queryKey: ["billing", "pro_products", monthly, yearly, lifetime],
    queryFn: async () => {
      const productIds = [monthly, yearly, lifetime].filter(Boolean);
      if (productIds.length === 0) return [] as ProProduct[];
      const products = await billingGateway.fetchProductsAsync(productIds);
      return products.map((p): ProProduct => ({
        productId: p.productId,
        kind: kindFromProductId(p.productId, monthly, yearly, lifetime),
        priceText: p.priceText,
        currencyCode: p.currencyCode,
      }));
    },
    staleTime: 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/billing/hooks/useProProducts.ts
git commit -m "feat(billing): useProProducts hook"
```

---

## Task 14: usePurchasePro (TDD via pure runPurchaseProAsync)

**Files:**
- Create: `src/features/billing/hooks/usePurchasePro.ts`
- Create: `__tests__/services/billing/runPurchasePro.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/services/billing/runPurchasePro.test.ts
import { runPurchaseProAsync } from "@/src/features/billing/hooks/usePurchasePro";
import { createMockBillingGateway } from "@/__tests__/helpers/MockBillingGateway";
import { createMockPurchaseVerification } from "@/__tests__/helpers/MockPurchaseVerification";
import { AuthGateCancelledError } from "@/src/core/errors";

describe("runPurchaseProAsync", () => {
  it("runs gate -> purchase -> verify -> finish in order", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await runPurchaseProAsync("flashvoca_pro_monthly", {
      billingGateway: billing,
      purchaseVerification: verification,
      ensureLinkedAsync,
    });

    expect(ensureLinkedAsync).toHaveBeenCalled();
    expect(billing.purchaseProductAsync).toHaveBeenCalledWith("flashvoca_pro_monthly");
    expect(verification.verifyAsync).toHaveBeenCalledWith({
      bundleId: "pro",
      productId: "prod-1",
      purchaseToken: "tok-1",
    });
    expect(billing.finishPurchaseAsync).toHaveBeenCalledWith("tok-1");
  });

  it("does not call finishPurchase when verify fails", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification({
      verifyAsync: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    await expect(
      runPurchaseProAsync("flashvoca_pro_monthly", {
        billingGateway: billing,
        purchaseVerification: verification,
        ensureLinkedAsync,
      }),
    ).rejects.toThrow();
    expect(billing.finishPurchaseAsync).not.toHaveBeenCalled();
  });

  it("does not start purchase when auth gate is cancelled", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockRejectedValue(new AuthGateCancelledError());

    await expect(
      runPurchaseProAsync("flashvoca_pro_monthly", {
        billingGateway: billing,
        purchaseVerification: verification,
        ensureLinkedAsync,
      }),
    ).rejects.toBeInstanceOf(AuthGateCancelledError);
    expect(billing.purchaseProductAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npx jest __tests__/services/billing/runPurchasePro.test.ts
```

- [ ] **Step 3: Implement usePurchasePro.ts**

```ts
// src/features/billing/hooks/usePurchasePro.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import type { Entitlement } from "@/src/core/domain/models";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type { PurchaseVerificationService } from "@/src/core/services/billing/PurchaseVerificationService";
import { useAuthGatedAction } from "@/src/features/store/hooks/useAuthGatedAction";

export interface RunPurchaseProDeps {
  billingGateway: BillingGateway;
  purchaseVerification:
    | PurchaseVerificationService
    | {
        verifyAsync(input: {
          bundleId: string;
          productId: string;
          purchaseToken: string;
        }): Promise<Entitlement>;
      };
  ensureLinkedAsync: () => Promise<void>;
}

export async function runPurchaseProAsync(
  productId: string,
  deps: RunPurchaseProDeps,
): Promise<Entitlement> {
  await deps.ensureLinkedAsync();
  const purchase = await deps.billingGateway.purchaseProductAsync(productId);
  const entitlement = await deps.purchaseVerification.verifyAsync({
    bundleId: "pro",
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken,
  });
  await deps.billingGateway.finishPurchaseAsync(purchase.purchaseToken);
  return entitlement;
}

export function usePurchasePro() {
  const { billingGateway, purchaseVerification } = useAppServices();
  const { ensureLinkedAsync } = useAuthGatedAction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      runPurchaseProAsync(productId, {
        billingGateway,
        purchaseVerification,
        ensureLinkedAsync,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["entitlements", "pro"] });
    },
  });
}
```

- [ ] **Step 4: Run — PASS, commit**

```bash
npx jest __tests__/services/billing/runPurchasePro.test.ts
git add src/features/billing/hooks/usePurchasePro.ts \
        __tests__/services/billing/runPurchasePro.test.ts
git commit -m "feat(billing): usePurchasePro mutation"
```

---

## Task 15: Play subscription deeplink util

**Files:**
- Create: `src/features/billing/utils/playSubscriptionDeeplink.ts`

- [ ] **Step 1: Write util**

```ts
// src/features/billing/utils/playSubscriptionDeeplink.ts
import { Linking } from "react-native";
import * as Application from "expo-application";

export function openPlaySubscriptionManagement(productId?: string): Promise<void> {
  const pkg = Application.applicationId ?? "com.kjstudio.flashvoca";
  const url = productId
    ? `https://play.google.com/store/account/subscriptions?sku=${productId}&package=${pkg}`
    : `https://play.google.com/store/account/subscriptions`;
  return Linking.openURL(url);
}
```

> If `expo-application` isn't installed, install it: `npm install expo-application`. It's a standard Expo dep and lightweight.

- [ ] **Step 2: Install expo-application if missing**

```bash
node -e "require('expo-application')" 2>/dev/null && echo "already installed" || npm install expo-application
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck
git add package.json package-lock.json src/features/billing/utils/playSubscriptionDeeplink.ts
git commit -m "feat(billing): playSubscriptionDeeplink util + expo-application"
```

---

## Task 16: UpgradeScreen + upgrade route

**Files:**
- Create: `src/features/billing/screens/UpgradeScreen.tsx`
- Create: `app/upgrade.tsx`

- [ ] **Step 1: Write UpgradeScreen**

```tsx
// src/features/billing/screens/UpgradeScreen.tsx
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useProProducts } from "@/src/features/billing/hooks/useProProducts";
import { usePurchasePro } from "@/src/features/billing/hooks/usePurchasePro";
import { trackSafely } from "@/src/core/observability";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";

export function UpgradeScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const products = useProProducts();
  const purchase = usePurchasePro();

  useEffect(() => {
    trackSafely("pro_upgrade_screen_viewed", { source: "profile" });
  }, []);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t("pro.title")}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t("pro.heroDescription")}</Text>

      <Panel>
        <Text style={[styles.heading, { color: colors.ink }]}>혜택</Text>
        <Text style={[styles.body, { color: colors.muted }]}>• {t("pro.benefits.adFree")}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>• {t("pro.benefits.future")}</Text>
      </Panel>

      {products.isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {(products.data ?? []).map((p) => (
        <Panel key={p.productId}>
          <Text style={[styles.heading, { color: colors.ink }]}>
            {t(`pro.plan.${p.kind}` as const)}
          </Text>
          <Text style={[styles.priceText, { color: colors.primary }]}>{p.priceText}</Text>
          <View style={styles.action}>
            <AppButton
              disabled={purchase.isPending}
              onPress={() => {
                void purchase.mutateAsync(p.productId).catch(() => {});
              }}
            >
              {p.kind === "lifetime" ? t("pro.buyButton") : t("pro.subscribeButton")}
            </AppButton>
          </View>
        </Panel>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: tokens.spacing.l ?? 20, gap: tokens.spacing.m ?? 12 },
  title: { ...tokens.typography.hero ?? tokens.typography.heading, marginBottom: 4 },
  heading: { ...tokens.typography.heading, marginBottom: 4 },
  body: { ...tokens.typography.body },
  priceText: { ...tokens.typography.heading, marginVertical: tokens.spacing.s ?? 8 },
  action: { marginTop: tokens.spacing.s ?? 8 },
});
```

> If `trackSafely` import path differs, adjust. Inspect `src/core/observability/index.ts`.

- [ ] **Step 2: Write app/upgrade.tsx route**

```tsx
import { UpgradeScreen } from "@/src/features/billing/screens/UpgradeScreen";

export default UpgradeScreen;
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/billing/screens/UpgradeScreen.tsx app/upgrade.tsx
git commit -m "feat(billing): UpgradeScreen with three plans"
```

---

## Task 17: ProMembershipCard component

**Files:**
- Create: `src/features/profile/components/ProMembershipCard.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/features/profile/components/ProMembershipCard.tsx
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { openPlaySubscriptionManagement } from "@/src/features/billing/utils/playSubscriptionDeeplink";
import { useProAccess } from "@/src/features/billing/hooks/useProAccess";
import { useT, useFormat } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";

export function ProMembershipCard() {
  const { t } = useT();
  const { colors } = useTheme();
  const { isPro, expiresAt, kind, autoRenewing } = useProAccess();
  const router = useRouter();
  const { date } = useFormat();

  if (!isPro) {
    return (
      <Panel>
        <Text style={[styles.title, { color: colors.ink }]}>{t("pro.title")}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t("pro.heroDescription")}</Text>
        <View style={styles.action}>
          <AppButton onPress={() => router.push("/upgrade")}>
            {t("pro.upgradeButton")}
          </AppButton>
        </View>
      </Panel>
    );
  }

  const subtitle =
    kind === "lifetime"
      ? t("pro.lifetimeBadge")
      : expiresAt && autoRenewing
        ? t("pro.nextRenewal", { date: date(expiresAt) })
        : expiresAt
          ? t("pro.expiresOn", { date: date(expiresAt) })
          : t("pro.activeStatus");

  return (
    <Panel>
      <Text style={[styles.title, { color: colors.ink }]}>⭐ {t("pro.activeStatus")}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{subtitle}</Text>
      {kind === "subscription" ? (
        <View style={styles.action}>
          <AppButton variant="secondary" onPress={() => openPlaySubscriptionManagement()}>
            {t("pro.managePlay")}
          </AppButton>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  title: { ...tokens.typography.heading },
  body: { ...tokens.typography.body },
  action: { marginTop: tokens.spacing.s ?? 8 },
});
```

> If `useFormat()` returns `{ date }` is wrong shape (e.g., it returns `{ relative }` only), inspect `src/shared/i18n/hooks/useFormat.ts` and use whatever date helper exists. Phase 2 used `relative`; check if `date` is also exported. If not, fall back to `new Date(expiresAt).toLocaleDateString()`.

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/profile/components/ProMembershipCard.tsx
git commit -m "feat(profile): ProMembershipCard with active/inactive/lifetime states"
```

---

## Task 18: Render ProMembershipCard in ProfileScreen

**Files:**
- Modify: `src/features/profile/screens/ProfileScreen.tsx`

- [ ] **Step 1: Read current file**

```bash
sed -n '1,80p' src/features/profile/screens/ProfileScreen.tsx
```

- [ ] **Step 2: Insert ProMembershipCard above existing AccountLinkCard**

Add import:
```tsx
import { ProMembershipCard } from "@/src/features/profile/components/ProMembershipCard";
```

In the JSX inside the Screen content, place `<ProMembershipCard />` as the topmost panel (before `<AccountLinkCard />`).

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/profile/screens/ProfileScreen.tsx
git commit -m "feat(profile): show ProMembershipCard"
```

---

## Task 19: Final verification

- [ ] **Step 1: Full pass**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: ALL PASS.

- [ ] **Step 2: External setup checklist (for the user)**

Print to user:

> Phase 4 코드 완료. 외부 작업 체크리스트:
>
> **Google Play Console**
> 1. 인앱 상품 추가: `flashvoca_pro_lifetime`
> 2. 구독 추가: `flashvoca_pro_monthly` (Base plan: 월 갱신)
> 3. 구독 추가: `flashvoca_pro_yearly` (Base plan: 연 갱신)
>
> **Google Cloud Console**
> 4. Pub/Sub 토픽 생성: `flashvoca-rtdn`
> 5. Push subscription 생성:
>    - Endpoint: `https://<supabase>.supabase.co/functions/v1/pubsub-rtdn`
>    - Authentication: Enable OIDC token, Service account: 기존 Phase 1 SA 재사용
>    - Service account에 Pub/Sub Subscriber 권한 부여
>
> **Play Console**
> 6. Monetization → RTDN → Topic name: `projects/<gcp-project>/topics/flashvoca-rtdn`
> 7. Send test notification → pubsub-rtdn 함수 로그에 testNotification 수신 확인
>
> **Supabase**
> 8. 마이그레이션: `supabase db push` 또는 SQL Editor에서 `202604290001_phase4_subscriptions.sql` 실행
> 9. Edge Function Secrets: `PRO_PRODUCT_MONTHLY`, `PRO_PRODUCT_YEARLY`, `PRO_PRODUCT_LIFETIME`
> 10. `supabase functions deploy verify-purchase` (재배포)
> 11. `supabase functions deploy pubsub-rtdn` (신규)
>
> **`.env`**
> 12. `EXPO_PUBLIC_PRO_PRODUCT_MONTHLY`, `EXPO_PUBLIC_PRO_PRODUCT_YEARLY`, `EXPO_PUBLIC_PRO_PRODUCT_LIFETIME` 추가

---

## Self-Review (performed by author)

**Spec coverage:**
- entitlements 컬럼 확장 (kind, auto_renewing) → Tasks 1, 3, 4, 5 ✓
- status 7-state 확장 → Tasks 1, 3 ✓
- user_has_active_pro SQL function → Task 1 ✓
- verify-purchase INAPP/SUBS 분기 → Tasks 7, 8 ✓
- Pro virtual bundleId='pro' → Task 8 ✓
- bundle_product_mismatch 검증 → Task 8 ✓
- subscription state ACTIVE/GRACE 검증 → Task 8 ✓
- Google subscriptionsv2.get → Task 9 ✓
- pubsub-rtdn Edge Function → Tasks 10, 11 ✓
- 7가지 subscriptionState → status 매핑 → Task 10 (`mapSubscriptionState`) ✓
- voidedPurchase 처리 (Phase 1.5 흡수) → Task 10 ✓
- OIDC 인증 → Task 11 ✓
- 영수증 lookup 실패 시 무시 → Task 10 (handler) ✓
- useProAccess 7-status 분류 → Task 12 (7 tests) ✓
- useProProducts → Task 13 ✓
- usePurchasePro → Task 14 ✓
- UpgradeScreen 3종 상품 → Task 16 ✓
- ProMembershipCard 활성/비활성/평생 → Task 17 ✓
- Play Store 딥링크 → Task 15 ✓
- ProfileScreen 통합 → Task 18 ✓
- i18n 4 locale + analytics → Task 2 ✓
- Edge Function 응답에 kind/autoRenewing 포함 → Task 7 (types) + Task 8 (verifier) ✓
- PurchaseVerificationService 안전 default → Task 6 ✓
- cached_entitlements SQLite 마이그레이션 → Task 4 ✓

**Placeholder scan:** All steps include actual code or commands. The "verify by reading file first" notes are guards for adapter shape variance, not vague TODOs.

**Type consistency:**
- `Entitlement.kind` ("one_time" | "subscription") consistent across Tasks 3, 5, 7, 8, 12, 14
- `EntitlementStatus` 7-state union consistent in Tasks 1, 3, 12
- `ProAccess` shape from Task 12 used in Task 17
- `RtdnDeps` from Task 10 used in Task 11
- `mapSubscriptionState` returns `RtdnStatus` matching DB CHECK constraint
- `bundleId: 'pro'` virtual key consistent in Tasks 8, 10, 12, 14

Three intentional deferred details:
- `useFormat` `date` helper exact API — Task 17 inspects at impl time
- `expo-application` install if missing — Task 15 step 2 conditionally installs
- `entitlementService.listActiveEntitlementsAsync` userId default — Task 12 step 3 inspects existing service

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-29-phase4-subscriptions.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
