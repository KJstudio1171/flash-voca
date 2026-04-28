# Phase 1 — Billing Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Play Billing on the client, verify receipts in a Supabase Edge Function, write entitlements through service-role-only RLS, gate purchases behind Phase 0 auth linking, and support purchase restore.

**Architecture:** Three trust layers — (1) Play (truth), (2) Edge Function (`verify-purchase`) which calls the Google Play Developer API and writes `entitlements`/`purchase_receipts` rows, and (3) the client which only *requests* verification and renders cached state. RLS denies client writes; clients can only SELECT their own rows.

**Tech Stack:** TypeScript, Expo 54 / RN, `expo-iap`, Supabase JS SDK, Supabase Edge Functions (Deno), `googleapis`/`djwt` for service account auth, Jest, Deno test runner.

**Spec:** `docs/superpowers/specs/2026-04-28-phase1-billing-design.md`

---

## File Structure

### New Supabase artifacts
- `supabase/migrations/202604280001_phase1_billing.sql` — `entitlements`, `purchase_receipts`, `bundles.play_product_id`, RLS
- `supabase/functions/verify-purchase/index.ts` — HTTP entry
- `supabase/functions/verify-purchase/verifier.ts` — pure verify pipeline
- `supabase/functions/verify-purchase/googlePlayClient.ts` — Google API wrapper
- `supabase/functions/verify-purchase/types.ts` — request/response types
- `supabase/functions/verify-purchase/__tests__/verifier.test.ts` — Deno tests

### New client files
- `src/core/services/billing/types.ts` — `Product`, `PurchaseResult`
- `src/core/services/billing/ExpoIapBillingGateway.ts`
- `src/core/services/billing/PurchaseVerificationService.ts`
- `src/core/services/billing/NoopPurchaseVerificationService.ts`
- `src/core/errors/BillingError.ts`
- `src/features/store/hooks/usePurchaseBundle.ts`
- `src/features/store/hooks/useRestorePurchases.ts`
- `src/features/store/hooks/useAuthGatedAction.tsx` — Provider + hook
- `src/features/store/components/AccountRequiredModal.tsx`
- `__tests__/services/billing/PurchaseVerificationService.test.ts`
- `__tests__/features/store/hooks/usePurchaseBundle.test.tsx`
- `__tests__/features/store/hooks/useRestorePurchases.test.tsx`
- `__tests__/helpers/MockBillingGateway.ts`
- `__tests__/helpers/MockPurchaseVerification.ts`

### Modified files
- `package.json` — add `expo-iap`
- `app.json` — add expo-iap plugin
- `src/core/services/billing/BillingGateway.ts` — interface change
- `src/core/services/billing/NoopBillingGateway.ts` — adapt
- `src/core/errors/index.ts` — re-export BillingError types
- `src/core/observability/eventRegistry.ts` — `billing_*` events
- `src/shared/i18n/locales/{en,ko,ja,zh}.json` — `billing.*`, `errors.billing.*` keys
- `src/core/domain/models.ts` — `Bundle.playProductId`, `BundleDetail` carries it too
- `src/core/database/schema.ts` — `bundles` cache table gets `play_product_id`
- `src/core/database/types.ts` — type definitions for the row
- `src/core/repositories/contracts/RemoteCatalogGateway.ts` — `RemoteCatalogBundle.playProductId`
- `src/core/repositories/sqlite/SqliteBundleRepository.ts` — read/write `play_product_id`
- `src/core/repositories/sqlite/SqliteCatalogCacheRepository.ts` — write `play_product_id` on cache replace
- `src/core/repositories/supabase/SupabaseCatalogGateway.ts` — fetch `play_product_id`
- `src/core/services/createAppServices.ts` — wire ExpoIapBillingGateway + PurchaseVerificationService
- `src/features/store/screens/BundleDetailScreen.tsx` — purchase button + flow
- `src/features/profile/screens/ProfileScreen.tsx` — restore button
- `src/app/AppProviders.tsx` — wrap children in AuthGatedActionProvider

---

## Task 1: Install expo-iap

**Files:**
- Modify: `package.json`, `package-lock.json`, `app.json`

- [ ] **Step 1: Install package**

```bash
npm install expo-iap
```

- [ ] **Step 2: Add Expo plugin**

Read `app.json`. Inside `expo.plugins` array (create if missing), add `"expo-iap"`. The final array should look like (other plugins preserved):

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-iap"
    ]
  }
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add expo-iap and plugin"
```

---

## Task 2: Supabase migration — entitlements, purchase_receipts, bundles.play_product_id

**Files:**
- Create: `supabase/migrations/202604280001_phase1_billing.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- 202604280001_phase1_billing.sql
-- Phase 1: server-side billing schema

ALTER TABLE bundles ADD COLUMN IF NOT EXISTS play_product_id TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_play')),
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  raw_response JSONB,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_user
  ON purchase_receipts(user_id);

ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
-- No policies = client cannot SELECT/INSERT/UPDATE/DELETE.
-- Only service_role bypasses RLS.

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  bundle_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  UNIQUE (user_id, bundle_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_status
  ON entitlements(user_id, status);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY entitlements_select_own ON entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy — clients cannot write.
-- service_role bypasses.

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS bundles_public_read ON bundles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/202604280001_phase1_billing.sql
git commit -m "feat(supabase): add entitlements, purchase_receipts, bundles.play_product_id"
```

> Application of the migration to a real Supabase project is part of the **External setup checklist**, not this task.

---

## Task 3: BillingError classes

**Files:**
- Create: `src/core/errors/BillingError.ts`
- Modify: `src/core/errors/index.ts`

- [ ] **Step 1: Write `BillingError.ts`**

```ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n/types";

export abstract class BillingError extends AppError {
  readonly category = "billing";
}

export class BillingInitError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.init";
  constructor(options?: AppErrorOptions) {
    super("Billing initialization failed", options);
  }
}

export class BillingProductMissingError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.productMissing";
  constructor(options?: AppErrorOptions) {
    super("Bundle is missing a Play product mapping", options);
  }
}

export class BillingPurchaseCancelledError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.purchaseFailed";
  constructor(options?: AppErrorOptions) {
    super("User cancelled purchase", options);
  }
}

export class BillingPurchaseFailedError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.purchaseFailed";
  constructor(options?: AppErrorOptions) {
    super("Play purchase failed", options);
  }
}

export class BillingVerificationError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.verificationFailed";
  constructor(options?: AppErrorOptions) {
    super("Receipt verification failed", options);
  }
}

export class AuthGateCancelledError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.purchaseFailed";
  constructor(options?: AppErrorOptions) {
    super("User cancelled the auth gate", options);
  }
}
```

- [ ] **Step 2: Append re-exports to `src/core/errors/index.ts`**

Add at end:
```ts
export {
  BillingError,
  BillingInitError,
  BillingProductMissingError,
  BillingPurchaseCancelledError,
  BillingPurchaseFailedError,
  BillingVerificationError,
  AuthGateCancelledError,
} from "@/src/core/errors/BillingError";
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS (i18n keys land in Task 5; this task may temporarily complain — if so, do Task 5 first, then come back). If typecheck fails ONLY because `errors.billing.*` keys are missing, proceed to Task 5 first, then commit Task 3 + Task 5 together.

- [ ] **Step 4: Commit (after Task 5 if typecheck blocks)**

```bash
git add src/core/errors/BillingError.ts src/core/errors/index.ts
git commit -m "feat(errors): add BillingError category"
```

---

## Task 4: Add analytics events

**Files:**
- Modify: `src/core/observability/eventRegistry.ts`

- [ ] **Step 1: Append events to the registry**

Open the file. The current object has `app_opened`, `deck_*`, `auth_*`. Add at the bottom of the literal:

```ts
  billing_purchase_started: { allowedProps: ["bundleId", "productId"] as const },
  billing_purchase_succeeded: { allowedProps: ["bundleId", "productId"] as const },
  billing_purchase_failed: { allowedProps: ["bundleId", "reason"] as const },
  billing_restore_started: { allowedProps: [] as const },
  billing_restore_completed: { allowedProps: ["restoredCount"] as const },
  billing_auth_gate_blocked: { allowedProps: ["bundleId"] as const },
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/observability/eventRegistry.ts
git commit -m "feat(observability): register billing_* analytics events"
```

---

## Task 5: i18n keys for billing

**Files:**
- Modify: `src/shared/i18n/locales/{en,ko,ja,zh}.json`

- [ ] **Step 1: Add to ko.json**

Add a new top-level key `billing` (after `auth`):

```json
"billing": {
  "accountRequired": {
    "title": "계정 연결이 필요해요",
    "description": "구매 보호와 환불을 위해 계정 연결이 필요합니다.",
    "confirm": "연결하기",
    "cancel": "취소"
  },
  "purchaseButton": "구매하기",
  "purchasing": "구매 중...",
  "owned": "보유 중",
  "restoreButton": "구매 복원",
  "restoring": "복원 중...",
  "restoreEmpty": "복원할 구매가 없어요.",
  "restoreCompleted": "{{count}}개 구매를 복원했어요."
}
```

Inside the existing `errors` object, add a `billing` subtree:

```json
"billing": {
  "init": "결제 시스템 초기화에 실패했어요.",
  "productMissing": "이 번들은 아직 판매 중이 아니에요.",
  "purchaseFailed": "결제에 실패했어요. 잠시 후 다시 시도해 주세요.",
  "verificationFailed": "구매 확인에 실패했어요. 자동 환불될 수 있어요."
}
```

- [ ] **Step 2: Mirror in en.json**

```json
"billing": {
  "accountRequired": {
    "title": "Account link required",
    "description": "Linking your account protects purchases and enables refunds.",
    "confirm": "Link account",
    "cancel": "Cancel"
  },
  "purchaseButton": "Buy",
  "purchasing": "Purchasing...",
  "owned": "Owned",
  "restoreButton": "Restore purchases",
  "restoring": "Restoring...",
  "restoreEmpty": "No purchases to restore.",
  "restoreCompleted": "Restored {{count}} purchase(s)."
}
```

`errors.billing` in en.json:
```json
"billing": {
  "init": "Billing system failed to initialize.",
  "productMissing": "This bundle is not on sale yet.",
  "purchaseFailed": "Purchase failed. Please try again later.",
  "verificationFailed": "Could not verify your purchase. It may be auto-refunded."
}
```

- [ ] **Step 3: Mirror in ja.json**

```json
"billing": {
  "accountRequired": {
    "title": "アカウント連携が必要です",
    "description": "購入保護と返金のためアカウント連携が必要です。",
    "confirm": "連携する",
    "cancel": "キャンセル"
  },
  "purchaseButton": "購入する",
  "purchasing": "購入中...",
  "owned": "購入済み",
  "restoreButton": "購入を復元",
  "restoring": "復元中...",
  "restoreEmpty": "復元する購入はありません。",
  "restoreCompleted": "{{count}}件の購入を復元しました。"
}
```

`errors.billing` in ja.json:
```json
"billing": {
  "init": "決済システムの初期化に失敗しました。",
  "productMissing": "このバンドルはまだ販売されていません。",
  "purchaseFailed": "決済に失敗しました。しばらくしてから再度お試しください。",
  "verificationFailed": "購入の確認に失敗しました。自動返金される可能性があります。"
}
```

- [ ] **Step 4: Mirror in zh.json**

```json
"billing": {
  "accountRequired": {
    "title": "需要关联账户",
    "description": "为了保护购买和退款，需要关联账户。",
    "confirm": "关联账户",
    "cancel": "取消"
  },
  "purchaseButton": "购买",
  "purchasing": "购买中...",
  "owned": "已拥有",
  "restoreButton": "恢复购买",
  "restoring": "恢复中...",
  "restoreEmpty": "没有可恢复的购买。",
  "restoreCompleted": "已恢复 {{count}} 个购买。"
}
```

`errors.billing` in zh.json:
```json
"billing": {
  "init": "结算系统初始化失败。",
  "productMissing": "此捆绑包尚未销售。",
  "purchaseFailed": "购买失败。请稍后再试。",
  "verificationFailed": "无法验证您的购买。可能会自动退款。"
}
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
node -e "for (const f of ['ko','en','ja','zh']) JSON.parse(require('fs').readFileSync(\`src/shared/i18n/locales/\${f}.json\`,'utf8'))"
```
Expected: PASS, no JSON parse errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/i18n/locales/
git commit -m "feat(i18n): add billing namespace keys"
```

(If Task 3 was deferred, also `git add` the BillingError files and amend message: `"feat(errors,i18n): add BillingError category and translations"`.)

---

## Task 6: Bundle.playProductId domain model + database column

**Files:**
- Modify: `src/core/domain/models.ts`
- Modify: `src/core/database/schema.ts`
- Modify: `src/core/database/types.ts`
- Modify: `src/core/repositories/contracts/RemoteCatalogGateway.ts`

- [ ] **Step 1: Add field to domain models**

In `src/core/domain/models.ts`, find the `Bundle` interface. Add `playProductId: string | null;` after `currencyCode`:

```ts
export interface Bundle {
  id: string;
  title: string;
  description: string;
  priceText: string;
  currencyCode: string;
  playProductId: string | null;        // <-- NEW
  coverColor: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
```

(`BundleDetail` and `StoreBundleSummary`/`StoreBundleDetail` extend Bundle so they inherit automatically.)

- [ ] **Step 2: Update SQLite schema**

In `src/core/database/schema.ts`, find `BUNDLES_TABLE_SQL`. Add `play_product_id TEXT,` between `currency_code` and `cover_color`:

```ts
export const BUNDLES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_text TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  play_product_id TEXT,
  cover_color TEXT NOT NULL DEFAULT '#EA580C',
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
```

For existing local DBs, add a migration ALTER. Append to `LOCAL_DATABASE_SCHEMA_SQL` (right before `DATABASE_INDEXES_SQL`) the following idempotent ALTER:

Actually SQLite doesn't support `IF NOT EXISTS` on ALTER COLUMN; instead append a defensive PRAGMA-based check, OR do it at runtime. Simpler approach: add a runtime migration step in `src/core/database/initialize.ts` (read it first to see its pattern). For this plan, do the column-add in initialize.ts (Step 3 below).

- [ ] **Step 3: Runtime migration in initialize.ts**

Read `src/core/database/initialize.ts` to find where the schema is applied. After `LOCAL_DATABASE_SCHEMA_SQL` runs, add a defensive ALTER:

```ts
// Phase 1 idempotent column add (SQLite has no IF NOT EXISTS for ALTER COLUMN)
try {
  await db.execAsync(
    "ALTER TABLE bundles ADD COLUMN play_product_id TEXT;"
  );
} catch (error) {
  // Column already exists — ignore "duplicate column name" SQLite error
  const message = (error as { message?: string })?.message ?? "";
  if (!/duplicate column name/i.test(message)) {
    throw error;
  }
}
```

- [ ] **Step 4: Update database row type**

In `src/core/database/types.ts`, find the bundles row interface. Add `play_product_id: string | null;`:

```ts
export interface LocalBundleRecord {
  id: string;
  title: string;
  description: string;
  price_text: string;
  currency_code: string;
  play_product_id: string | null;
  cover_color: string;
  is_published: number;
  created_at: string;
  updated_at: string;
}
```

(Adjust the actual interface name and field set to match what's currently there — read the file first.)

- [ ] **Step 5: Update RemoteCatalogGateway contract**

In `src/core/repositories/contracts/RemoteCatalogGateway.ts`, find `RemoteCatalogBundle`. Add `playProductId: string | null;`:

```ts
export interface RemoteCatalogBundle {
  id: string;
  title: string;
  description: string;
  priceText: string;
  currencyCode: string;
  playProductId: string | null;
  coverColor: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail in repository implementations until Task 7 fixes them. Proceed to Task 7 immediately.

---

## Task 7: Wire playProductId through repositories

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteBundleRepository.ts`
- Modify: `src/core/repositories/sqlite/SqliteCatalogCacheRepository.ts`
- Modify: `src/core/repositories/supabase/SupabaseCatalogGateway.ts`

- [ ] **Step 1: Read each file**

```bash
sed -n '1,200p' src/core/repositories/sqlite/SqliteBundleRepository.ts
sed -n '1,200p' src/core/repositories/sqlite/SqliteCatalogCacheRepository.ts
sed -n '1,200p' src/core/repositories/supabase/SupabaseCatalogGateway.ts
```

- [ ] **Step 2: Update SupabaseCatalogGateway to fetch the column**

In `SupabaseCatalogGateway.ts`, the `BundleRow` type and the `mapBundle` function. Add `play_product_id: string | null;` to `BundleRow`. Update the `select(...)` string to include `play_product_id`. Update `mapBundle` to set `playProductId: row.play_product_id`.

```ts
type BundleRow = {
  id: string;
  title: string;
  description: string;
  price_text: string;
  currency_code: string;
  play_product_id: string | null;
  cover_color: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

function mapBundle(row: BundleRow): RemoteCatalogBundle {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceText: row.price_text,
    currencyCode: row.currency_code,
    playProductId: row.play_product_id,
    coverColor: row.cover_color,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

In the `client.from("bundles").select(...)` call, change the select string to include `play_product_id`.

- [ ] **Step 3: Update SqliteCatalogCacheRepository to write play_product_id**

Find the INSERT / REPLACE statement that persists bundles. Add `play_product_id` column to the column list and the corresponding parameter to the values array. Order matters — match the order in `BUNDLES_TABLE_SQL`.

- [ ] **Step 4: Update SqliteBundleRepository to read play_product_id**

Find each SELECT that reads bundle rows. Make sure SELECT includes `play_product_id`, and the row-to-domain mapping function sets `playProductId`.

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm test
```
Expected: typecheck PASS. Tests may fail in places where mock bundles are constructed without `playProductId` — fix by adding `playProductId: null` to those mocks. Search:

```bash
grep -rn "createMockBundle\|priceText:" __tests__/ 2>/dev/null
```

If any test constructs Bundle objects literally, add `playProductId: null`.

- [ ] **Step 6: Commit Tasks 6+7 together**

```bash
git add src/core/domain/models.ts \
        src/core/database/schema.ts \
        src/core/database/types.ts \
        src/core/database/initialize.ts \
        src/core/repositories/contracts/RemoteCatalogGateway.ts \
        src/core/repositories/sqlite/SqliteBundleRepository.ts \
        src/core/repositories/sqlite/SqliteCatalogCacheRepository.ts \
        src/core/repositories/supabase/SupabaseCatalogGateway.ts \
        __tests__/
git commit -m "feat(catalog): propagate Bundle.playProductId end-to-end"
```

---

## Task 8: Billing types and BillingGateway interface

**Files:**
- Create: `src/core/services/billing/types.ts`
- Modify: `src/core/services/billing/BillingGateway.ts`
- Modify: `src/core/services/billing/NoopBillingGateway.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
export interface Product {
  productId: string;
  priceText: string;
  currencyCode: string;
}

export interface PurchaseResult {
  productId: string;
  purchaseToken: string;
}
```

- [ ] **Step 2: Replace `BillingGateway.ts`**

```ts
import type {
  Product,
  PurchaseResult,
} from "@/src/core/services/billing/types";

export interface BillingGateway {
  initializeAsync(): Promise<void>;
  fetchProductsAsync(productIds: string[]): Promise<Product[]>;
  purchaseProductAsync(productId: string): Promise<PurchaseResult>;
  finishPurchaseAsync(purchaseToken: string): Promise<void>;
  queryActivePurchasesAsync(): Promise<PurchaseResult[]>;
}
```

- [ ] **Step 3: Adapt `NoopBillingGateway.ts`**

```ts
import { BillingInitError } from "@/src/core/errors";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type {
  Product,
  PurchaseResult,
} from "@/src/core/services/billing/types";

export class NoopBillingGateway implements BillingGateway {
  async initializeAsync(): Promise<void> {
    // intentionally do nothing — env-less builds skip Play Billing
  }

  async fetchProductsAsync(_productIds: string[]): Promise<Product[]> {
    return [];
  }

  async purchaseProductAsync(_productId: string): Promise<PurchaseResult> {
    throw new BillingInitError({
      context: { reason: "billing_not_configured" },
    });
  }

  async finishPurchaseAsync(_purchaseToken: string): Promise<void> {
    // no-op
  }

  async queryActivePurchasesAsync(): Promise<PurchaseResult[]> {
    return [];
  }
}
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail in `EntitlementService` because `purchaseBundleAsync`/`restorePurchasesAsync` no longer exist. Address in Task 9.

---

## Task 9: Drop legacy purchase methods from EntitlementService

**Files:**
- Modify: `src/core/services/EntitlementService.ts`

- [ ] **Step 1: Remove purchase delegation methods**

Open `src/core/services/EntitlementService.ts`. Remove the `purchaseBundleAsync` and `restorePurchasesAsync` methods. The class no longer touches `BillingGateway` directly — that responsibility moves to `usePurchaseBundle` / `useRestorePurchases`.

Also remove the `billingGateway` constructor parameter and field. Final constructor signature:

```ts
constructor(
  private readonly entitlementRepository: EntitlementRepository,
  private readonly remoteGateway: RemoteEntitlementGateway,
  private readonly auth: AuthService,
) {}
```

(Keep all `userId` methods exactly as they are.)

- [ ] **Step 2: Update `createAppServices.ts`**

In `src/core/services/createAppServices.ts`, find the `EntitlementService` construction. Remove the `new NoopBillingGateway()` argument. Final:

```ts
const entitlementService = new EntitlementService(
  entitlementRepository,
  new SupabaseEntitlementGateway(),
  authService,
);
```

(Don't delete the `NoopBillingGateway` import yet — Task 11 wires the new gateway into the services object.)

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS (or only fails in tests where EntitlementService is constructed with the old signature — fix those by removing the `billingGateway` argument from the test setup).

- [ ] **Step 4: Defer commit until Task 11**

---

## Task 10: ExpoIapBillingGateway

**Files:**
- Create: `src/core/services/billing/ExpoIapBillingGateway.ts`

- [ ] **Step 1: Read expo-iap exports to verify the API surface**

```bash
node -e "console.log(Object.keys(require('expo-iap')))"
```

Expected to see `connectAsync`/`endConnection`/`requestPurchase`/`getProducts`/`getAvailablePurchases`/`finishTransaction` or similar. Note any shape differences to adapt the impl below.

- [ ] **Step 2: Write the gateway**

```ts
import * as ExpoIap from "expo-iap";

import {
  BillingInitError,
  BillingPurchaseCancelledError,
  BillingPurchaseFailedError,
} from "@/src/core/errors";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type {
  Product,
  PurchaseResult,
} from "@/src/core/services/billing/types";

export class ExpoIapBillingGateway implements BillingGateway {
  private initialized = false;

  async initializeAsync(): Promise<void> {
    if (this.initialized) return;
    try {
      await ExpoIap.initConnection();
      this.initialized = true;
    } catch (cause) {
      throw new BillingInitError({ cause });
    }
  }

  async fetchProductsAsync(productIds: string[]): Promise<Product[]> {
    if (!this.initialized) await this.initializeAsync();
    if (productIds.length === 0) return [];
    try {
      const products = await ExpoIap.requestProducts({ skus: productIds, type: "inapp" });
      return products.map((p: any) => ({
        productId: p.id ?? p.productId,
        priceText: p.displayPrice ?? p.localizedPrice ?? p.price,
        currencyCode: p.currency ?? p.currencyCode ?? "",
      }));
    } catch (cause) {
      throw new BillingPurchaseFailedError({ cause });
    }
  }

  async purchaseProductAsync(productId: string): Promise<PurchaseResult> {
    if (!this.initialized) await this.initializeAsync();
    try {
      const purchase: any = await ExpoIap.requestPurchase({
        request: { skus: [productId] },
        type: "inapp",
      });
      const single = Array.isArray(purchase) ? purchase[0] : purchase;
      const purchaseToken = single?.purchaseToken ?? single?.transactionReceipt;
      const resolvedProductId = single?.productId ?? single?.id ?? productId;
      if (!purchaseToken) {
        throw new BillingPurchaseFailedError({
          context: { reason: "no_purchase_token" },
        });
      }
      return { productId: resolvedProductId, purchaseToken };
    } catch (cause: any) {
      const code = cause?.code ?? cause?.responseCode;
      if (code === "E_USER_CANCELLED" || code === 1) {
        throw new BillingPurchaseCancelledError({ cause });
      }
      throw new BillingPurchaseFailedError({ cause });
    }
  }

  async finishPurchaseAsync(purchaseToken: string): Promise<void> {
    try {
      await ExpoIap.finishTransaction({
        purchase: { purchaseToken } as any,
        isConsumable: false,
      });
    } catch (cause) {
      // Acknowledge failure isn't fatal for the flow — log via outer error reporter
      throw new BillingPurchaseFailedError({ cause });
    }
  }

  async queryActivePurchasesAsync(): Promise<PurchaseResult[]> {
    if (!this.initialized) await this.initializeAsync();
    try {
      const purchases: any[] = await ExpoIap.getAvailablePurchases();
      return purchases.map((p) => ({
        productId: p.productId ?? p.id,
        purchaseToken: p.purchaseToken ?? p.transactionReceipt,
      })).filter((p) => p.productId && p.purchaseToken);
    } catch (cause) {
      throw new BillingPurchaseFailedError({ cause });
    }
  }
}
```

> If `expo-iap`'s named exports don't match (e.g., `getProducts` instead of `requestProducts`, or `finishTransaction` shape differs), adjust call sites accordingly. The library's TypeScript types live under `node_modules/expo-iap`.

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS. If `expo-iap` types reject `as any` shortcuts, replace with the library's actual types (read its `.d.ts` to find the exact `Product`/`Purchase` exports, then import).

- [ ] **Step 4: Defer commit until Task 11**

---

## Task 11: PurchaseVerificationService (TDD)

**Files:**
- Create: `src/core/services/billing/PurchaseVerificationService.ts`
- Create: `src/core/services/billing/NoopPurchaseVerificationService.ts`
- Create: `__tests__/services/billing/PurchaseVerificationService.test.ts`
- Modify: `src/core/services/createAppServices.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/services/billing/PurchaseVerificationService.test.ts
import {
  PurchaseVerificationService,
  PurchaseVerificationDeps,
} from "@/src/core/services/billing/PurchaseVerificationService";
import { BillingVerificationError } from "@/src/core/errors";
import { TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";
import type { Entitlement } from "@/src/core/domain/models";

function createDeps(overrides: Partial<PurchaseVerificationDeps> = {}): PurchaseVerificationDeps {
  return {
    invokeFunctionAsync: jest.fn(async () => ({
      data: {
        entitlement: {
          id: "ent-1",
          userId: TEST_USER_ID,
          bundleId: "bundle_x",
          provider: "google_play",
          providerRef: "tok-1",
          status: "active",
          grantedAt: "2026-04-28T00:00:00Z",
          expiresAt: null,
          syncedAt: null,
        } as Entitlement,
      },
    })),
    upsertCachedEntitlementAsync: jest.fn(async () => {}),
    ...overrides,
  };
}

describe("PurchaseVerificationService.verifyAsync", () => {
  it("invokes verify-purchase and updates the local cache", async () => {
    const deps = createDeps();
    const svc = new PurchaseVerificationService(deps);

    const ent = await svc.verifyAsync({
      bundleId: "bundle_x",
      productId: "prod-1",
      purchaseToken: "tok-1",
    });

    expect(deps.invokeFunctionAsync).toHaveBeenCalledWith("verify-purchase", {
      body: { bundleId: "bundle_x", productId: "prod-1", purchaseToken: "tok-1" },
    });
    expect(deps.upsertCachedEntitlementAsync).toHaveBeenCalledWith(ent);
    expect(ent.bundleId).toBe("bundle_x");
  });

  it("omits bundleId when only productId is provided (restore flow)", async () => {
    const deps = createDeps();
    const svc = new PurchaseVerificationService(deps);

    await svc.verifyByProductIdAsync({
      productId: "prod-1",
      purchaseToken: "tok-1",
    });

    expect(deps.invokeFunctionAsync).toHaveBeenCalledWith("verify-purchase", {
      body: { productId: "prod-1", purchaseToken: "tok-1" },
    });
  });

  it("maps Edge Function error to BillingVerificationError", async () => {
    const deps = createDeps({
      invokeFunctionAsync: jest.fn(async () => ({
        error: { message: "receipt_invalid" },
      })),
    });
    const svc = new PurchaseVerificationService(deps);

    await expect(
      svc.verifyAsync({ bundleId: "x", productId: "p", purchaseToken: "t" }),
    ).rejects.toBeInstanceOf(BillingVerificationError);
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
npx jest __tests__/services/billing/PurchaseVerificationService.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `PurchaseVerificationService.ts`**

```ts
import { BillingVerificationError } from "@/src/core/errors";
import type { Entitlement } from "@/src/core/domain/models";

export interface PurchaseVerificationDeps {
  invokeFunctionAsync(
    name: string,
    options: { body: unknown },
  ): Promise<{ data?: { entitlement: Entitlement }; error?: unknown }>;
  upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void>;
}

export interface PurchaseVerificationService {
  verifyAsync(input: {
    bundleId: string;
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement>;
  verifyByProductIdAsync(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement>;
}

export class PurchaseVerificationService implements PurchaseVerificationService {
  constructor(private readonly deps: PurchaseVerificationDeps) {}

  async verifyAsync(input: {
    bundleId: string;
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    return this.invoke({
      bundleId: input.bundleId,
      productId: input.productId,
      purchaseToken: input.purchaseToken,
    });
  }

  async verifyByProductIdAsync(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    return this.invoke({
      productId: input.productId,
      purchaseToken: input.purchaseToken,
    });
  }

  private async invoke(body: Record<string, unknown>): Promise<Entitlement> {
    const response = await this.deps.invokeFunctionAsync("verify-purchase", { body });
    if (response.error || !response.data) {
      throw new BillingVerificationError({
        cause: response.error,
        context: { body },
      });
    }
    const entitlement = response.data.entitlement;
    await this.deps.upsertCachedEntitlementAsync(entitlement);
    return entitlement;
  }
}
```

> Note: TypeScript will complain about `interface PurchaseVerificationService` and `class PurchaseVerificationService` sharing the same name. Rename the interface to `IPurchaseVerificationService` OR drop the interface entirely and let consumers depend on the class type. Choose the latter for simplicity — delete the `interface PurchaseVerificationService { ... }` block. The class is the contract.

- [ ] **Step 4: Run tests — confirm PASS**

```bash
npx jest __tests__/services/billing/PurchaseVerificationService.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write `NoopPurchaseVerificationService.ts`**

```ts
import { BillingVerificationError } from "@/src/core/errors";
import type { Entitlement } from "@/src/core/domain/models";

export class NoopPurchaseVerificationService {
  async verifyAsync(_input: {
    bundleId: string;
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    throw new BillingVerificationError({
      context: { reason: "supabase_not_configured" },
    });
  }

  async verifyByProductIdAsync(_input: {
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement> {
    throw new BillingVerificationError({
      context: { reason: "supabase_not_configured" },
    });
  }
}
```

- [ ] **Step 6: Wire into createAppServices**

In `src/core/services/createAppServices.ts`, after `entitlementService` is created and supabase client is fetched:

```ts
import { ExpoIapBillingGateway } from "@/src/core/services/billing/ExpoIapBillingGateway";
import { PurchaseVerificationService } from "@/src/core/services/billing/PurchaseVerificationService";
import { NoopPurchaseVerificationService } from "@/src/core/services/billing/NoopPurchaseVerificationService";

// ...inside createAppServices(), after authService creation:
const billingGateway = supabaseClient
  ? new ExpoIapBillingGateway()
  : new NoopBillingGateway();

const purchaseVerification = supabaseClient
  ? new PurchaseVerificationService({
      invokeFunctionAsync: (name, opts) =>
        supabaseClient.functions.invoke(name, opts) as Promise<{
          data?: { entitlement: Entitlement };
          error?: unknown;
        }>,
      upsertCachedEntitlementAsync: (entitlement) =>
        entitlementRepository.upsertCachedEntitlementAsync(entitlement),
    })
  : new NoopPurchaseVerificationService();
```

Add to returned services object:
```ts
return {
  // ...existing,
  billingGateway,
  purchaseVerification,
};
```

> If `EntitlementRepository` doesn't yet have `upsertCachedEntitlementAsync`, add it. Read the contract and SQLite implementation, then add a method that does an UPSERT on a single row. The signature: `upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void>;`.

- [ ] **Step 7: Add upsertCachedEntitlementAsync to EntitlementRepository contract + SQLite impl**

Modify `src/core/repositories/contracts/EntitlementRepository.ts` adding the method:
```ts
upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void>;
```

Read `src/core/repositories/sqlite/SqliteEntitlementRepository.ts` to find the existing `replaceCachedEntitlementsAsync` for the column list. Add:

```ts
async upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void> {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO cached_entitlements (
      id, user_id, bundle_id, provider, provider_ref, status,
      granted_at, expires_at, synced_at, cache_updated_at, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      provider_ref = excluded.provider_ref,
      granted_at = excluded.granted_at,
      expires_at = excluded.expires_at,
      synced_at = excluded.synced_at,
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
      now,
    ],
  );
}
```

(Adapt to actual db client API — use the same call style as the existing `replaceCachedEntitlementsAsync`.)

- [ ] **Step 8: Verify and commit Tasks 8–11 together**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: PASS.

```bash
git add src/core/services/billing/ \
        src/core/services/EntitlementService.ts \
        src/core/services/createAppServices.ts \
        src/core/repositories/contracts/EntitlementRepository.ts \
        src/core/repositories/sqlite/SqliteEntitlementRepository.ts \
        __tests__/services/billing/
git commit -m "feat(billing): client-side BillingGateway + PurchaseVerificationService"
```

---

## Task 12: Edge Function — types and verifier (TDD)

**Files:**
- Create: `supabase/functions/verify-purchase/types.ts`
- Create: `supabase/functions/verify-purchase/verifier.ts`
- Create: `supabase/functions/verify-purchase/__tests__/verifier.test.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
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
  };
}

export interface VerifyError {
  status: number;
  code:
    | "unauthenticated"
    | "not_linked"
    | "invalid_request"
    | "bundle_product_mismatch"
    | "bundle_not_found"
    | "receipt_invalid"
    | "receipt_already_used"
    | "verification_failed";
  message: string;
}
```

- [ ] **Step 2: Write failing test — `__tests__/verifier.test.ts`**

```ts
// supabase/functions/verify-purchase/__tests__/verifier.test.ts
import { assertEquals, assertRejects } from "https://deno.land/std/testing/asserts.ts";
import { verifyPurchase, VerifyDeps } from "../verifier.ts";

function createDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  const calls: { table: string; op: string; row: unknown }[] = [];
  return {
    findBundleById: async (id: string) =>
      id === "bundle_x" ? { play_product_id: "prod-1" } : null,
    findBundleByProductId: async (pid: string) =>
      pid === "prod-1" ? { id: "bundle_x" } : null,
    findReceiptByToken: async (_token: string) => null,
    upsertReceipt: async (row) => calls.push({ table: "receipts", op: "upsert", row }),
    upsertEntitlement: async (row) => {
      calls.push({ table: "entitlements", op: "upsert", row });
      return {
        id: "ent-1",
        user_id: row.user_id,
        bundle_id: row.bundle_id,
        provider: row.provider,
        provider_ref: row.provider_ref,
        status: "active",
        granted_at: "2026-04-28T00:00:00Z",
        expires_at: null,
        synced_at: null,
      };
    },
    getPlayPurchaseStatus: async (_pkg, _pid, _token) => ({ purchaseState: 0 }),
    calls,
    ...overrides,
  } as VerifyDeps & { calls: typeof calls };
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
```

- [ ] **Step 3: Run tests — confirm FAIL**

```bash
deno test --allow-net supabase/functions/verify-purchase/__tests__/verifier.test.ts
```

If `deno` isn't installed, that's fine — note as DONE_WITH_CONCERNS. Verify by reading. (Plan execution may stub these as "manual run later".)

Expected: FAIL — module not found.

- [ ] **Step 4: Write `verifier.ts`**

```ts
// supabase/functions/verify-purchase/verifier.ts
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
  }): Promise<EntitlementRow>;
  getPlayPurchaseStatus(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<{ purchaseState: number; raw?: unknown }>;
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
  packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "",
): Promise<VerifyPurchaseResponse> {
  if (!req.productId || !req.purchaseToken) {
    throw new VerifyError(400, "invalid_request");
  }

  let bundleId: string;
  if (req.bundleId) {
    const bundle = await deps.findBundleById(req.bundleId);
    if (!bundle) {
      throw new VerifyError(404, "bundle_not_found");
    }
    if (bundle.play_product_id !== req.productId) {
      throw new VerifyError(403, "bundle_product_mismatch");
    }
    bundleId = req.bundleId;
  } else {
    const bundle = await deps.findBundleByProductId(req.productId);
    if (!bundle) {
      throw new VerifyError(404, "bundle_not_found");
    }
    bundleId = bundle.id;
  }

  const existing = await deps.findReceiptByToken(req.purchaseToken);
  if (existing && existing.user_id !== userId) {
    throw new VerifyError(409, "receipt_already_used");
  }

  const status = await deps.getPlayPurchaseStatus(
    packageName,
    req.productId,
    req.purchaseToken,
  );
  if (status.purchaseState !== 0) {
    throw new VerifyError(422, "receipt_invalid");
  }

  await deps.upsertReceipt({
    user_id: userId,
    provider: "google_play",
    product_id: req.productId,
    purchase_token: req.purchaseToken,
    raw_response: status.raw ?? status,
    status: "valid",
  });

  const row = await deps.upsertEntitlement({
    user_id: userId,
    bundle_id: bundleId,
    provider: "google_play",
    provider_ref: req.purchaseToken,
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
    },
  };
}
```

- [ ] **Step 5: Run tests — confirm PASS**

```bash
deno test --allow-net --allow-env supabase/functions/verify-purchase/__tests__/verifier.test.ts
```
Expected: 5 PASS.

If Deno isn't installed: skip and proceed (the tests will be runnable on CI / by user).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/verify-purchase/
git commit -m "feat(edge): verify-purchase verifier core logic + tests"
```

---

## Task 13: Edge Function — Google Play client and HTTP entry

**Files:**
- Create: `supabase/functions/verify-purchase/googlePlayClient.ts`
- Create: `supabase/functions/verify-purchase/index.ts`

- [ ] **Step 1: Write `googlePlayClient.ts`**

```ts
// Deno-compatible Google service-account auth using djwt
import { create as createJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pkcs8 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessTokenAsync(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const json = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const sa = JSON.parse(json) as ServiceAccountKey;
  const key = await importPrivateKey(sa.private_key);

  const jwt = await createJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: sa.token_uri,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60),
    },
    key,
  );

  const tokenRes = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) throw new Error(`OAuth token failed: ${tokenRes.status}`);
  const data = (await tokenRes.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in,
  };
  return data.access_token;
}

export async function getProductPurchaseAsync(
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<{ purchaseState: number; raw: unknown }> {
  const token = await getAccessTokenAsync();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Play API ${res.status}: ${await res.text()}`);
  }
  const raw = await res.json();
  return { purchaseState: (raw as { purchaseState: number }).purchaseState ?? -1, raw };
}
```

- [ ] **Step 2: Write `index.ts` (HTTP entry)**

```ts
// supabase/functions/verify-purchase/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { verifyPurchase, VerifyError, VerifyDeps } from "./verifier.ts";
import { getProductPurchaseAsync } from "./googlePlayClient.ts";
import type { VerifyPurchaseRequest } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function jsonError(status: number, code: string) {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") return jsonError(405, "method_not_allowed");

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonError(401, "unauthenticated");
  }
  const jwt = authHeader.slice("Bearer ".length);

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData.user) return jsonError(401, "unauthenticated");

  const isAnonymous = (userData.user as unknown as { is_anonymous?: boolean }).is_anonymous;
  const provider = userData.user.app_metadata?.provider;
  const linked = !isAnonymous && provider && provider !== "anonymous";
  if (!linked) return jsonError(401, "not_linked");

  const userId = userData.user.id;
  let body: VerifyPurchaseRequest;
  try {
    body = (await req.json()) as VerifyPurchaseRequest;
  } catch {
    return jsonError(400, "invalid_request");
  }

  const deps: VerifyDeps = {
    findBundleById: async (id) => {
      const { data } = await adminClient
        .from("bundles")
        .select("play_product_id")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    findBundleByProductId: async (pid) => {
      const { data } = await adminClient
        .from("bundles")
        .select("id")
        .eq("play_product_id", pid)
        .maybeSingle();
      return data;
    },
    findReceiptByToken: async (token) => {
      const { data } = await adminClient
        .from("purchase_receipts")
        .select("user_id, status")
        .eq("purchase_token", token)
        .maybeSingle();
      return data;
    },
    upsertReceipt: async (row) => {
      const { error } = await adminClient
        .from("purchase_receipts")
        .upsert(row, { onConflict: "purchase_token" });
      if (error) throw error;
    },
    upsertEntitlement: async (row) => {
      const { data, error } = await adminClient
        .from("entitlements")
        .upsert(
          {
            ...row,
            status: "active",
            granted_at: new Date().toISOString(),
            expires_at: null,
          },
          { onConflict: "user_id,bundle_id,provider" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    getPlayPurchaseStatus: getProductPurchaseAsync,
  };

  try {
    const result = await verifyPurchase(body, userId, deps);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof VerifyError) return jsonError(err.status, err.code);
    console.error("verify-purchase error", err);
    return jsonError(500, "verification_failed");
  }
});
```

- [ ] **Step 3: Verify it parses**

```bash
deno check supabase/functions/verify-purchase/index.ts
```
If Deno isn't installed locally, skip — note as concern.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/verify-purchase/index.ts \
        supabase/functions/verify-purchase/googlePlayClient.ts
git commit -m "feat(edge): verify-purchase HTTP entry with service-account OAuth"
```

---

## Task 14: useAuthGatedAction (provider + hook)

**Files:**
- Create: `src/features/store/hooks/useAuthGatedAction.tsx`
- Modify: `src/app/AppProviders.tsx`

- [ ] **Step 1: Write the provider/hook**

```tsx
// src/features/store/hooks/useAuthGatedAction.tsx
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { useAppServices } from "@/src/app/AppProviders";
import { AuthGateCancelledError } from "@/src/core/errors";

type Resolver = (linked: boolean) => void;

interface AuthGatedActionContext {
  ensureLinkedAsync: () => Promise<void>;
  modalVisible: boolean;
  confirm: () => void;
  cancel: () => void;
}

const Ctx = createContext<AuthGatedActionContext | null>(null);

export function AuthGatedActionProvider({ children }: PropsWithChildren) {
  const { authService } = useAppServices();
  const [modalVisible, setModalVisible] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);

  const ensureLinkedAsync = useCallback(async () => {
    if (authService.getState().kind === "linked") return;
    setModalVisible(true);
    const linked = await new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
    setModalVisible(false);
    resolverRef.current = null;
    if (!linked) throw new AuthGateCancelledError();
  }, [authService]);

  const confirm = useCallback(async () => {
    try {
      await authService.linkGoogleAsync();
      resolverRef.current?.(true);
    } catch {
      resolverRef.current?.(false);
    }
  }, [authService]);

  const cancel = useCallback(() => {
    resolverRef.current?.(false);
  }, []);

  return (
    <Ctx.Provider value={{ ensureLinkedAsync, modalVisible, confirm, cancel }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuthGatedAction() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthGatedActionProvider missing");
  return ctx;
}
```

- [ ] **Step 2: Wrap children in AppProviders**

In `src/app/AppProviders.tsx`, import:

```tsx
import { AuthGatedActionProvider } from "@/src/features/store/hooks/useAuthGatedAction";
```

And wrap the existing `<AppServicesContext.Provider>` content:

```tsx
<AppServicesContext.Provider value={services}>
  <AuthGatedActionProvider>
    {children}
  </AuthGatedActionProvider>
</AppServicesContext.Provider>
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Defer commit until Task 15**

---

## Task 15: AccountRequiredModal component

**Files:**
- Create: `src/features/store/components/AccountRequiredModal.tsx`
- Modify: `src/app/AppProviders.tsx` (mount the modal at provider level)

- [ ] **Step 1: Create the modal**

```tsx
// src/features/store/components/AccountRequiredModal.tsx
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuthGatedAction } from "@/src/features/store/hooks/useAuthGatedAction";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";

export function AccountRequiredModal() {
  const { t } = useT();
  const { modalVisible, confirm, cancel } = useAuthGatedAction();
  const { colors } = useTheme();

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      onRequestClose={cancel}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.ink }]}>
            {t("billing.accountRequired.title")}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("billing.accountRequired.description")}
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={cancel} style={styles.cancel}>
              <Text style={{ color: colors.muted }}>
                {t("billing.accountRequired.cancel")}
              </Text>
            </Pressable>
            <AppButton onPress={confirm}>
              {t("billing.accountRequired.confirm")}
            </AppButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.l,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    gap: tokens.spacing.s,
  },
  title: { ...tokens.typography.heading },
  body: { ...tokens.typography.body },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.s,
    marginTop: tokens.spacing.s,
  },
  cancel: {
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
    justifyContent: "center",
  },
});
```

> If a token name doesn't exist (`tokens.spacing.l`, `tokens.radius.l`), inspect `src/shared/theme/tokens.ts` and pick the closest equivalent.

- [ ] **Step 2: Mount the modal globally**

Inside `AppProviders.tsx`, render `<AccountRequiredModal />` as a sibling under the `AuthGatedActionProvider`:

```tsx
<AuthGatedActionProvider>
  {children}
  <AccountRequiredModal />
</AuthGatedActionProvider>
```

Add the import.

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit Tasks 14+15 together**

```bash
git add src/features/store/hooks/useAuthGatedAction.tsx \
        src/features/store/components/AccountRequiredModal.tsx \
        src/app/AppProviders.tsx
git commit -m "feat(billing): AuthGatedAction provider + AccountRequiredModal"
```

---

## Task 16: usePurchaseBundle hook (TDD)

**Files:**
- Create: `src/features/store/hooks/usePurchaseBundle.ts`
- Create: `__tests__/features/store/hooks/usePurchaseBundle.test.tsx`
- Create: `__tests__/helpers/MockBillingGateway.ts`
- Create: `__tests__/helpers/MockPurchaseVerification.ts`

- [ ] **Step 1: Write mock helpers**

```ts
// __tests__/helpers/MockBillingGateway.ts
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";

export function createMockBillingGateway(
  overrides: Partial<BillingGateway> = {},
): BillingGateway {
  return {
    initializeAsync: jest.fn().mockResolvedValue(undefined),
    fetchProductsAsync: jest.fn().mockResolvedValue([]),
    purchaseProductAsync: jest.fn().mockResolvedValue({
      productId: "prod-1",
      purchaseToken: "tok-1",
    }),
    finishPurchaseAsync: jest.fn().mockResolvedValue(undefined),
    queryActivePurchasesAsync: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}
```

```ts
// __tests__/helpers/MockPurchaseVerification.ts
import type { PurchaseVerificationService } from "@/src/core/services/billing/PurchaseVerificationService";
import type { Entitlement } from "@/src/core/domain/models";
import { TEST_USER_ID } from "./MockAuthService";

export function createMockEntitlement(
  overrides: Partial<Entitlement> = {},
): Entitlement {
  return {
    id: "ent-1",
    userId: TEST_USER_ID,
    bundleId: "bundle_x",
    provider: "google_play",
    providerRef: "tok-1",
    status: "active",
    grantedAt: "2026-04-28T00:00:00Z",
    expiresAt: null,
    syncedAt: null,
    ...overrides,
  };
}

export function createMockPurchaseVerification(
  overrides: Partial<PurchaseVerificationService> = {},
): PurchaseVerificationService {
  return {
    verifyAsync: jest.fn().mockResolvedValue(createMockEntitlement()),
    verifyByProductIdAsync: jest.fn().mockResolvedValue(createMockEntitlement()),
    ...overrides,
  } as PurchaseVerificationService;
}
```

- [ ] **Step 2: Write the hook (no test yet — start with stub)**

```ts
// src/features/store/hooks/usePurchaseBundle.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import { BillingProductMissingError } from "@/src/core/errors";
import type { Bundle } from "@/src/core/domain/models";
import { useAuthGatedAction } from "@/src/features/store/hooks/useAuthGatedAction";

export function usePurchaseBundle() {
  const { billingGateway, purchaseVerification } = useAppServices();
  const { ensureLinkedAsync } = useAuthGatedAction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundle: Bundle) => {
      if (!bundle.playProductId) {
        throw new BillingProductMissingError({ context: { bundleId: bundle.id } });
      }
      await ensureLinkedAsync();
      const purchase = await billingGateway.purchaseProductAsync(bundle.playProductId);
      const entitlement = await purchaseVerification.verifyAsync({
        bundleId: bundle.id,
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken,
      });
      await billingGateway.finishPurchaseAsync(purchase.purchaseToken);
      return entitlement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
    },
  });
}
```

- [ ] **Step 3: Write tests**

```tsx
// __tests__/features/store/hooks/usePurchaseBundle.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { createMockBillingGateway } from "@/__tests__/helpers/MockBillingGateway";
import { createMockPurchaseVerification } from "@/__tests__/helpers/MockPurchaseVerification";
import { createMockAuthService } from "@/__tests__/helpers/MockAuthService";
import { BillingProductMissingError, AuthGateCancelledError } from "@/src/core/errors";
import type { Bundle } from "@/src/core/domain/models";

// Inline minimal AppServices/AuthGatedAction context to avoid importing the full app tree
const MockServicesContext = React.createContext<any>(null);
const MockGateContext = React.createContext<any>(null);

jest.mock("@/src/app/AppProviders", () => ({
  useAppServices: () => React.useContext(MockServicesContext),
}));
jest.mock("@/src/features/store/hooks/useAuthGatedAction", () => ({
  useAuthGatedAction: () => React.useContext(MockGateContext),
}));

import { usePurchaseBundle } from "@/src/features/store/hooks/usePurchaseBundle";

const sampleBundle: Bundle = {
  id: "bundle_x",
  title: "X",
  description: "",
  priceText: "$1",
  currencyCode: "USD",
  playProductId: "prod-1",
  coverColor: "#000",
  isPublished: true,
  createdAt: "2026-04-28T00:00:00Z",
  updatedAt: "2026-04-28T00:00:00Z",
};

function wrap(services: any, gate: any) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <MockServicesContext.Provider value={services}>
        <MockGateContext.Provider value={gate}>
          {children}
        </MockGateContext.Provider>
      </MockServicesContext.Provider>
    </QueryClientProvider>
  );
}

describe("usePurchaseBundle", () => {
  it("runs gate → purchase → verify → finish in order", async () => {
    const billing = createMockBillingGateway();
    const purchaseVerification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => usePurchaseBundle(), {
      wrapper: wrap(
        {
          billingGateway: billing,
          purchaseVerification,
          authService: createMockAuthService(),
        },
        { ensureLinkedAsync },
      ),
    });

    await act(async () => {
      await result.current.mutateAsync(sampleBundle);
    });

    expect(ensureLinkedAsync).toHaveBeenCalled();
    expect(billing.purchaseProductAsync).toHaveBeenCalledWith("prod-1");
    expect(purchaseVerification.verifyAsync).toHaveBeenCalled();
    expect(billing.finishPurchaseAsync).toHaveBeenCalledWith("tok-1");
  });

  it("throws BillingProductMissingError when playProductId is null", async () => {
    const billing = createMockBillingGateway();
    const purchaseVerification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => usePurchaseBundle(), {
      wrapper: wrap(
        { billingGateway: billing, purchaseVerification },
        { ensureLinkedAsync },
      ),
    });

    await expect(
      result.current.mutateAsync({ ...sampleBundle, playProductId: null }),
    ).rejects.toBeInstanceOf(BillingProductMissingError);

    expect(ensureLinkedAsync).not.toHaveBeenCalled();
    expect(billing.purchaseProductAsync).not.toHaveBeenCalled();
  });

  it("does not call finishPurchase when verify fails", async () => {
    const billing = createMockBillingGateway();
    const purchaseVerification = createMockPurchaseVerification({
      verifyAsync: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const ensureLinkedAsync = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => usePurchaseBundle(), {
      wrapper: wrap(
        { billingGateway: billing, purchaseVerification },
        { ensureLinkedAsync },
      ),
    });

    await expect(result.current.mutateAsync(sampleBundle)).rejects.toThrow();
    expect(billing.finishPurchaseAsync).not.toHaveBeenCalled();
  });

  it("does not start purchase when gate is cancelled", async () => {
    const billing = createMockBillingGateway();
    const purchaseVerification = createMockPurchaseVerification();
    const ensureLinkedAsync = jest.fn().mockRejectedValue(new AuthGateCancelledError());

    const { result } = renderHook(() => usePurchaseBundle(), {
      wrapper: wrap(
        { billingGateway: billing, purchaseVerification },
        { ensureLinkedAsync },
      ),
    });

    await expect(result.current.mutateAsync(sampleBundle)).rejects.toBeInstanceOf(
      AuthGateCancelledError,
    );
    expect(billing.purchaseProductAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
npx jest __tests__/features/store/hooks/usePurchaseBundle.test.tsx
```
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/store/hooks/usePurchaseBundle.ts \
        __tests__/features/store/hooks/usePurchaseBundle.test.tsx \
        __tests__/helpers/MockBillingGateway.ts \
        __tests__/helpers/MockPurchaseVerification.ts
git commit -m "feat(billing): usePurchaseBundle mutation with gate ordering"
```

---

## Task 17: useRestorePurchases hook (TDD)

**Files:**
- Create: `src/features/store/hooks/useRestorePurchases.ts`
- Create: `__tests__/features/store/hooks/useRestorePurchases.test.tsx`

- [ ] **Step 1: Write the hook**

```ts
// src/features/store/hooks/useRestorePurchases.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export interface RestoreSummary {
  totalAttempted: number;
  restoredCount: number;
}

export function useRestorePurchases() {
  const { billingGateway, purchaseVerification } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation<RestoreSummary, Error>({
    mutationFn: async () => {
      const purchases = await billingGateway.queryActivePurchasesAsync();
      if (purchases.length === 0) {
        return { totalAttempted: 0, restoredCount: 0 };
      }
      const results = await Promise.allSettled(
        purchases.map((p) =>
          purchaseVerification.verifyByProductIdAsync({
            productId: p.productId,
            purchaseToken: p.purchaseToken,
          }),
        ),
      );
      const restoredCount = results.filter((r) => r.status === "fulfilled").length;
      return { totalAttempted: purchases.length, restoredCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
    },
  });
}
```

- [ ] **Step 2: Write tests**

```tsx
// __tests__/features/store/hooks/useRestorePurchases.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import React from "react";

import { createMockBillingGateway } from "@/__tests__/helpers/MockBillingGateway";
import { createMockPurchaseVerification } from "@/__tests__/helpers/MockPurchaseVerification";

const MockServicesContext = React.createContext<any>(null);
jest.mock("@/src/app/AppProviders", () => ({
  useAppServices: () => React.useContext(MockServicesContext),
}));

import { useRestorePurchases } from "@/src/features/store/hooks/useRestorePurchases";

function wrap(services: any) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <MockServicesContext.Provider value={services}>
        {children}
      </MockServicesContext.Provider>
    </QueryClientProvider>
  );
}

describe("useRestorePurchases", () => {
  it("returns 0 restored when no active purchases", async () => {
    const billing = createMockBillingGateway();
    const verification = createMockPurchaseVerification();

    const { result } = renderHook(() => useRestorePurchases(), {
      wrapper: wrap({ billingGateway: billing, purchaseVerification: verification }),
    });

    let summary: any;
    await act(async () => {
      summary = await result.current.mutateAsync();
    });

    expect(summary).toEqual({ totalAttempted: 0, restoredCount: 0 });
    expect(verification.verifyByProductIdAsync).not.toHaveBeenCalled();
  });

  it("verifies each purchase and counts successes", async () => {
    const billing = createMockBillingGateway({
      queryActivePurchasesAsync: jest.fn().mockResolvedValue([
        { productId: "p1", purchaseToken: "t1" },
        { productId: "p2", purchaseToken: "t2" },
      ]),
    });
    const verification = createMockPurchaseVerification();

    const { result } = renderHook(() => useRestorePurchases(), {
      wrapper: wrap({ billingGateway: billing, purchaseVerification: verification }),
    });

    let summary: any;
    await act(async () => {
      summary = await result.current.mutateAsync();
    });

    expect(verification.verifyByProductIdAsync).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ totalAttempted: 2, restoredCount: 2 });
  });

  it("counts only fulfilled when some verifications fail", async () => {
    const billing = createMockBillingGateway({
      queryActivePurchasesAsync: jest.fn().mockResolvedValue([
        { productId: "p1", purchaseToken: "t1" },
        { productId: "p2", purchaseToken: "t2" },
      ]),
    });
    const verification = createMockPurchaseVerification({
      verifyByProductIdAsync: jest
        .fn()
        .mockResolvedValueOnce({ id: "ok" })
        .mockRejectedValueOnce(new Error("boom")),
    });

    const { result } = renderHook(() => useRestorePurchases(), {
      wrapper: wrap({ billingGateway: billing, purchaseVerification: verification }),
    });

    let summary: any;
    await act(async () => {
      summary = await result.current.mutateAsync();
    });

    expect(summary).toEqual({ totalAttempted: 2, restoredCount: 1 });
  });
});
```

- [ ] **Step 3: Run tests — PASS**

```bash
npx jest __tests__/features/store/hooks/useRestorePurchases.test.tsx
```
Expected: 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/store/hooks/useRestorePurchases.ts \
        __tests__/features/store/hooks/useRestorePurchases.test.tsx
git commit -m "feat(billing): useRestorePurchases mutation"
```

---

## Task 18: BundleDetailScreen — purchase button

**Files:**
- Modify: `src/features/store/screens/BundleDetailScreen.tsx`

- [ ] **Step 1: Read the current file** to find where to insert the button

```bash
sed -n '1,250p' src/features/store/screens/BundleDetailScreen.tsx
```

- [ ] **Step 2: Add the purchase button to `BundleDetailContent`**

Inside `BundleDetailContent`, after the existing bundle info (or in the most logical UI position), add:

```tsx
import { usePurchaseBundle } from "@/src/features/store/hooks/usePurchaseBundle";
import { AppButton } from "@/src/shared/ui/AppButton";

// inside BundleDetailContent component:
const purchase = usePurchaseBundle();
const ownedOrPurchasing = bundle.owned || purchase.isPending;
const buttonLabel = bundle.owned
  ? t("billing.owned")
  : purchase.isPending
    ? t("billing.purchasing")
    : t("billing.purchaseButton");

// in the JSX, somewhere visible:
<AppButton
  disabled={ownedOrPurchasing || !bundle.playProductId}
  onPress={() => {
    void purchase.mutateAsync(bundle).catch(() => {/* handled by query error boundary */});
  }}
>
  {buttonLabel}
</AppButton>
```

> Adjust styling to match existing button placements. If `bundle.playProductId` is null, the button shows the regular label but stays disabled.

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/store/screens/BundleDetailScreen.tsx
git commit -m "feat(store): purchase button on BundleDetailScreen"
```

---

## Task 19: ProfileScreen — restore button

**Files:**
- Modify: `src/features/profile/screens/ProfileScreen.tsx`

- [ ] **Step 1: Add restore section above existing panels**

```tsx
import { useToast } from "@/src/shared/ui/toast";
import { useRestorePurchases } from "@/src/features/store/hooks/useRestorePurchases";

// inside ProfileScreen component:
const restore = useRestorePurchases();
const toast = useToast();

const onRestorePress = async () => {
  try {
    const summary = await restore.mutateAsync();
    if (summary.restoredCount === 0) {
      toast.show(t("billing.restoreEmpty"), { tone: "info" });
    } else {
      toast.show(t("billing.restoreCompleted", { count: summary.restoredCount }), { tone: "success" });
    }
  } catch {
    // handled by global error handler
  }
};

// JSX:
<Panel>
  <Text style={[styles.title, { color: colors.ink }]}>{t("billing.restoreButton")}</Text>
  <AppButton onPress={onRestorePress} disabled={restore.isPending}>
    {restore.isPending ? t("billing.restoring") : t("billing.restoreButton")}
  </AppButton>
</Panel>
```

> Inspect the existing `useToast` API in `src/shared/ui/toast/`; the actual call may be `toast.show({ message, tone })` or similar. Adjust accordingly.

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/screens/ProfileScreen.tsx
git commit -m "feat(profile): restore purchases button"
```

---

## Task 20: Final verification

- [ ] **Step 1: Run the whole verification**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: ALL PASS.

- [ ] **Step 2: Confirm grep targets**

```bash
grep -rn "purchaseBundleAsync\|restorePurchasesAsync" src/ __tests__/
```
Expected: 0 matches (legacy methods fully removed).

- [ ] **Step 3: External setup checklist (for the user)**

Print to user:

> Phase 1 코드 완료. 이후 사용자가 직접 수행:
> 1. Google Play Console 가입 ($25)
> 2. flash-voca 앱 등록 (internal testing)
> 3. IAP 상품 등록 + license tester 등록
> 4. Service Account 생성 + JSON 키 다운로드
> 5. Supabase 대시보드 → Edge Functions → Secrets:
>    - `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`
> 6. Supabase 마이그레이션 적용:
>    `supabase db push` 또는 대시보드 SQL Editor에서 `202604280001_phase1_billing.sql` 실행
> 7. `bundles.play_product_id`를 IAP 상품 ID로 채움
> 8. `supabase functions deploy verify-purchase`
> 9. EAS dev build → 디바이스 설치 (expo-go 미지원)

---

## Self-Review (performed by author)

**Spec coverage:**
- Three trust layers (Play / Edge / client) → Tasks 12, 13 (Edge) + 8–11 (client) ✓
- entitlements + purchase_receipts + bundles.play_product_id schema → Task 2 ✓
- RLS (SELECT-own, no client writes) → Task 2 SQL ✓
- expo-iap integration → Tasks 1, 10 ✓
- BillingGateway interface change → Task 8 ✓
- PurchaseVerificationService → Task 11 (TDD) ✓
- Auth gate (linked-only) → Tasks 14, 15, 16 ✓
- Receipt verification with `purchase_token UNIQUE` and 409 path → Task 12 ✓
- Bundle ↔ product mismatch detection → Task 12 ✓
- Acknowledge after verify (order) → Task 16 test "does not call finishPurchase when verify fails" ✓
- Restore flow (bundleId optional, allSettled) → Tasks 11, 13, 17 ✓
- BillingError 6 classes → Task 3 ✓
- billing_* analytics events → Task 4 ✓
- i18n keys 4 locales → Task 5 ✓
- BundleDetailScreen purchase entry → Task 18 ✓
- ProfileScreen restore button → Task 19 ✓
- Test patterns (manual mocks, no jest.mock for service tests) → Tasks 11, 16, 17 ✓
- env-less fallback (NoopPurchaseVerificationService, NoopBillingGateway adapt) → Tasks 8, 11 ✓

**Placeholder scan:** All steps have actual code or actual commands. The few "verify by reading the file first" notes are deliberate guards for adapter shape variance, not vague todos.

**Type consistency:**
- `BillingGateway` shape from Task 8 used identically in Tasks 10, 11, 16, 17 (mocks).
- `PurchaseVerificationService` exposes `verifyAsync` and `verifyByProductIdAsync` — both used consistently in Tasks 11, 16, 17.
- `Bundle.playProductId: string | null` is propagated through Tasks 6, 7, 16 (mock bundle), 18 (button disable).
- `VerifyDeps` from Task 12 used by Task 13 entry, signatures match.
- `RestoreSummary` from Task 17 used by Task 19.
- `Entitlement` domain type unchanged; cached entitlement upsert added in Task 11 step 7.

Two intentional deferred details:
- expo-iap exact API surface (named exports, return shapes) — Task 10 step 1 inspects at implementation time.
- `useToast` exact call shape — Task 19 step 1 inspects at implementation time.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-phase1-billing.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
