# Phase 4 — 구독 인프라 (Pro Membership) 설계

작성일: 2026-04-29
상태: 설계 승인 대기
선행 단계: Phase 0 (인증), Phase 1 (결제 보안)

## 배경

Phase 1에서 일회성 결제(INAPP) 보안 인프라를 구축했습니다. Phase 4는 그 위에 **구독(SUBS) 결제 + 환불 RTDN webhook**을 추가하여 "Flash Voca Pro" 멤버십을 도입합니다.

이번 Phase는 **결제 인프라만**을 다룹니다 — Pro로 잠금 해제할 실제 기능은 0개이고, 미래에 deck sync / FSRS / AI 카드 생성 같은 기능을 단계적으로 게이팅할 수 있는 단일 진입점(`useProAccess()` 훅)을 만듭니다.

## 목표 / 비목표

### 목표
- Play Billing **구독(SUBS)** 결제 흐름 도입 (월/연)
- **Lifetime** 일회성 구매 추가 (Phase 1 INAPP 메커니즘 재사용)
- 영수증 검증 Edge Function이 INAPP/SUBS 모두 처리하도록 확장
- **RTDN webhook** 신규 Edge Function (구독 갱신/취소/환불 자동 반영)
- **Pro 활성 여부** 단일 진실 (`useProAccess()` 훅)
- 업그레이드 화면 + 프로필 카드 + Play Store 구독 관리 딥링크
- 결제 시점 인증 게이트 (Phase 1 패턴 재사용 — `state.kind === "linked"` 강제)
- Phase 1.5(환불 webhook) 흡수 — 같은 RTDN 토픽이라 별도 단계 불필요

### 비목표 (Phase 4 범위 외)
- **기능별 Pro 게이트** (실제로 막히는 기능 0개 — 미래 작업)
- iOS App Store Subscriptions (별도 Phase)
- 가족 공유 추가 처리 (Play 자동 처리)
- 트라이얼/할인 (Play Console에서 코드 변경 없이 추후)
- 구독 등급 분리 (Basic/Premium 다층) — Pro 한 등급만
- 광고 SDK / 광고 제거 기능
- 자체 결제 이력 화면 (Play Store 사용)
- 사용자 등급 통계/대시보드
- Pro 사용자별 fit (Phase B+의 영역)

## 핵심 결정사항

| 결정 | 채택안 |
|---|---|
| 구독 모델 | **앱 단위 Pro 멤버십** (모든 미래 기능 unlock) |
| 가격/주기 | **월 + 연 + Lifetime** 3종 |
| RTDN 범위 | **구독 + 환불 통합** (Phase 1.5 흡수) |
| Edge Function 구조 | **verify-purchase 확장** (별도 함수 X) — INAPP/SUBS productId 분기 |
| 콘텐츠 접근 판정 | **Single Pro entitlement** (`bundle_id='pro'` 가상 키) + 클라이언트 OR 룰 |
| 인프라 범위 | **인프라만** — 기능 게이팅 0개 |
| 구독 관리 UI | **프로필 카드 + Play Store 딥링크** |
| acknowledge 위치 | **클라이언트** (`expo-iap.finishTransaction`) — Phase 1 동일 |

## 아키텍처

### Phase 1과의 차이점

| 측면 | Phase 1 (일회성) | Phase 4 (구독) |
|---|---|---|
| Play 상품 타입 | INAPP | INAPP (Lifetime) + **SUBS (월/연)** |
| Google API | `purchases.products.get` | `purchases.products.get` (Lifetime) + **`purchases.subscriptionsv2.get` (구독)** |
| 만료 | 영구 (`expires_at = null`) | 시점 만료 (`expires_at = ISO8601`) |
| 갱신 처리 | 불필요 | RTDN으로 자동 (`expires_at` 연장) |
| 검증 트리거 | 클라이언트 결제 직후 1회 | 결제 직후 1회 + **RTDN 수신 시** |

### 데이터 흐름

```
구매 시점:
[expo-iap 구매] → verify-purchase Edge Function
                  → Google API (products or subscriptionsv2)
                  → entitlements UPSERT (bundle_id='pro')

갱신/취소/환불:
Google Play → Pub/Sub Topic → pubsub-rtdn Edge Function
                              → entitlements UPDATE (status, expires_at)
                              ↓
              클라이언트는 다음 entitlement sync 시 자동 반영
```

### 새 추상화

| 영역 | 신규/변경 | 위치 |
|---|---|---|
| `verify-purchase` | **확장** — productId로 INAPP/SUBS 자동 분기 | `supabase/functions/verify-purchase/` |
| `pubsub-rtdn` | **신규** — Pub/Sub 메시지 처리 | `supabase/functions/pubsub-rtdn/` |
| `useProAccess()` | 신규 — Pro 활성 여부 판정 | `src/features/billing/hooks/useProAccess.ts` |
| `useProProducts()` | 신규 — 월/연/Lifetime 3종 상품 정보 | `src/features/billing/hooks/useProProducts.ts` |
| `usePurchasePro()` | 신규 — 구독 결제 mutation | `src/features/billing/hooks/usePurchasePro.ts` |
| `ProMembershipCard` | 신규 — 프로필 화면 카드 | `src/features/profile/components/ProMembershipCard.tsx` |
| `UpgradeScreen` | 신규 — 가격 비교 + 결제 진입점 | `src/features/billing/screens/UpgradeScreen.tsx` |

### 핵심 원칙 (Phase 1 계승)

> **권한 판정의 권위는 서버에 있다. 클라이언트는 캐시만 본다.**

- Pro 활성 여부 판정 조건: `entitlements.status IN ('active','in_grace','cancelled') AND (expires_at IS NULL OR expires_at > NOW())`
- 클라이언트의 `cached_entitlements`는 화면 표시용 캐시일 뿐
- 만료/갱신/환불은 서버가 RTDN으로 갱신, 클라이언트는 그것을 읽기만

### 결제 시점 인증 게이트 (Phase 1 재사용)

`useAuthGatedAction` 훅 그대로 사용 — `state.kind === "linked"` 강제. provider-agnostic.

## 데이터 모델

### Supabase 신규 마이그레이션 — `entitlements` 확장

```sql
-- 202604290001_phase4_subscriptions.sql

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'one_time'
    CHECK (kind IN ('one_time', 'subscription')),
  ADD COLUMN IF NOT EXISTS auto_renewing BOOLEAN NOT NULL DEFAULT false;

-- 기존 status 체크 확장 (구독 상태 추가)
ALTER TABLE entitlements
  DROP CONSTRAINT IF EXISTS entitlements_status_check;

ALTER TABLE entitlements
  ADD CONSTRAINT entitlements_status_check
    CHECK (status IN ('active', 'in_grace', 'on_hold', 'paused', 'cancelled', 'expired', 'revoked'));

-- Pro 활성 판정 함수
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

### `status` 의미 매트릭스

| `status` | 의미 | Pro 활성? |
|---|---|---|
| `active` | 정상 — 구독 갱신 중이거나 일회성 영구 | ✅ |
| `in_grace` | 결제 실패했지만 Play 재시도 중 (3일) | ✅ (관대) |
| `on_hold` | grace 끝나고 결제 여전히 실패 (Play 30일 보유) | ❌ |
| `paused` | 사용자가 일시 정지 | ❌ |
| `cancelled` | 사용자가 취소했지만 만료일까지 사용 가능 | ✅ (만료까지) |
| `expired` | 완전히 종료 | ❌ |
| `revoked` | 환불 완료 | ❌ |

### Pro 가상 bundle ID

`entitlements.bundle_id = 'pro'`는 실제 `bundles` 테이블 행이 아닌 **가상 키**. Edge Function의 `findBundleById('pro')`는 lookup 안 하고 special-case로 처리.

### 로컬 SQLite 변경

`cached_entitlements`에 컬럼 2개 추가:
```sql
ALTER TABLE cached_entitlements
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'one_time';
ALTER TABLE cached_entitlements
  ADD COLUMN auto_renewing INTEGER NOT NULL DEFAULT 0;
```

런타임 ALTER 패턴 (Phase 1의 `bundles.play_product_id` 추가와 동일 방식). schema_version 7→8.

### 도메인 모델 변경

`src/core/domain/models.ts`:

```ts
export interface Entitlement {
  // 기존
  id: string;
  userId: string;
  bundleId: string;
  provider: string;
  providerRef: string | null;
  status: EntitlementStatus;     // 7종 union
  grantedAt: string;
  expiresAt: string | null;
  syncedAt: string | null;
  // Phase 4 추가
  kind: "one_time" | "subscription";
  autoRenewing: boolean;
}

export type EntitlementStatus =
  | "active" | "in_grace" | "on_hold" | "paused"
  | "cancelled" | "expired" | "revoked";
```

## Edge Function 변경

### `verify-purchase` 확장

기존 흐름 유지하면서 productId로 INAPP/SUBS 자동 분기.

#### 새 환경변수
```
PRO_PRODUCT_MONTHLY=flashvoca_pro_monthly
PRO_PRODUCT_YEARLY=flashvoca_pro_yearly
PRO_PRODUCT_LIFETIME=flashvoca_pro_lifetime
```

#### 분기 로직 (의사 코드)

```ts
const proIds = [proMonthly, proYearly, proLifetime].filter(Boolean);
const isPro = proIds.includes(req.productId);
const isSubs = req.productId === proMonthly || req.productId === proYearly;

let bundleId: string;
let kind: 'one_time' | 'subscription';
let expiresAt: string | null = null;
let autoRenewing = false;

if (isPro) {
  bundleId = 'pro';
  kind = isSubs ? 'subscription' : 'one_time';
} else {
  bundleId = await findBundleId(req);
  kind = 'one_time';
}

if (isSubs) {
  const sub = await playApi.subscriptionsv2.get(packageName, req.purchaseToken);
  if (!isAcknowledgeableSubscriptionState(sub.subscriptionState)) {
    throw new VerifyError(422, 'receipt_invalid');
  }
  expiresAt = sub.lineItems[0].expiryTime ?? null;
  autoRenewing = sub.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';
} else {
  // INAPP — Phase 1 흐름
}

// purchase_receipts UPSERT (공통)
// entitlements UPSERT — kind, expires_at, auto_renewing 포함
```

#### 멱등성

`purchase_token UNIQUE` 제약 그대로. 같은 영수증 재검증 시 entitlements도 UPSERT라 멱등.

### `pubsub-rtdn` 신규 Edge Function

#### 위치
```
supabase/functions/pubsub-rtdn/
  index.ts
  notificationHandler.ts
  __tests__/notificationHandler.test.ts
```

기존 `verify-purchase`의 `googlePlayClient.ts`를 재사용 (subscriptionsv2.get 추가됨).

#### 인증 — Pub/Sub Push Subscription

OIDC 토큰 검증:
1. Authorization 헤더에서 ID Token 추출
2. `tokeninfo` 또는 JWKS 검증
3. `aud` claim이 우리 Edge Function URL과 일치
4. `email` claim이 Pub/Sub service account 이메일과 일치

#### HTTP 흐름

```ts
serve(async (req) => {
  if (!await verifyPubSubOIDC(req)) return new Response('unauthorized', { status: 401 });

  const body = await req.json();
  const decoded = JSON.parse(atob(body.message.data));

  try {
    if (decoded.subscriptionNotification) {
      await handleSubscriptionNotification(decoded);
    } else if (decoded.voidedPurchaseNotification) {
      await handleVoidedPurchase(decoded);
    }
    return new Response('', { status: 204 });
  } catch (error) {
    console.error('rtdn handler error', error);
    return new Response('', { status: 500 });
  }
});
```

#### Subscription notification → status 매핑

| Google `subscriptionState` | 우리 `status` |
|---|---|
| `SUBSCRIPTION_STATE_ACTIVE` | `active` |
| `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` | `in_grace` |
| `SUBSCRIPTION_STATE_ON_HOLD` | `on_hold` |
| `SUBSCRIPTION_STATE_PAUSED` | `paused` |
| `SUBSCRIPTION_STATE_CANCELED` | `cancelled` |
| `SUBSCRIPTION_STATE_EXPIRED` | `expired` |
| `SUBSCRIPTION_STATE_REVOKED` | `revoked` |

#### 핵심 처리 패턴

> **Notification은 트리거일 뿐, 진실은 매번 Google API에서 조회.**

```ts
async function handleSubscriptionNotification(payload, deps) {
  const { purchaseToken } = payload.subscriptionNotification;
  const receipt = await deps.findReceiptByToken(purchaseToken);
  if (!receipt) return;  // verify-purchase가 아직 안 처리한 경우

  const sub = await deps.getSubscriptionState(packageName, purchaseToken);
  const status = mapSubscriptionState(sub.subscriptionState);
  const expiresAt = sub.lineItems?.[0]?.expiryTime ?? null;
  const autoRenewing = sub.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';

  await deps.updateEntitlement({
    user_id: receipt.user_id,
    bundle_id: 'pro',
    provider: 'google_play',
    status, expires_at: expiresAt, auto_renewing: autoRenewing,
  });
}
```

#### 환불 처리 (`voidedPurchaseNotification`)

```ts
async function handleVoidedPurchase(payload, deps) {
  const { purchaseToken } = payload.voidedPurchaseNotification;
  const receipt = await deps.findReceiptByToken(purchaseToken);
  if (!receipt) return;

  await deps.updateReceiptStatus(purchaseToken, 'refunded');
  await deps.revokeEntitlementsByProviderRef(purchaseToken);
}
```

이로써 Phase 1.5(환불 webhook)가 흡수됨.

## 클라이언트

### 모듈 구성

```
src/features/billing/
  ├─ hooks/
  │  ├─ useProAccess.ts            "Pro 활성 여부" 단일 진실
  │  ├─ useProProducts.ts          월/연/Lifetime 3종 상품 정보
  │  └─ usePurchasePro.ts          구독 결제 mutation
  └─ screens/
     └─ UpgradeScreen.tsx          가격 비교 + 결제 진입점

src/features/profile/components/
  └─ ProMembershipCard.tsx         Pro 활성/비활성 카드

src/features/billing/utils/
  └─ playSubscriptionDeeplink.ts   Play Store 구독 관리 URL
```

### `useProAccess()` 훅 (단일 진실)

```ts
export interface ProAccess {
  isPro: boolean;
  expiresAt: string | null;
  status: "active" | "in_grace" | "cancelled" | null;
  kind: "subscription" | "lifetime" | null;
  autoRenewing: boolean;
}

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

  const isActive =
    ["active", "in_grace", "cancelled"].includes(data.status) &&
    (data.expiresAt === null || new Date(data.expiresAt) > new Date());

  return {
    isPro: isActive,
    expiresAt: data.expiresAt,
    status: isActive ? (data.status as ProAccess["status"]) : null,
    kind: data.kind === "subscription" ? "subscription" : "lifetime",
    autoRenewing: data.autoRenewing,
  };
}
```

이 훅이 미래 모든 기능 게이팅의 진입점.

### `useProProducts()` — 상품 정보

```ts
export interface ProProduct {
  productId: string;
  kind: "monthly" | "yearly" | "lifetime";
  priceText: string;
  currencyCode: string;
}
```

`billingGateway.fetchProductsAsync(productIds)` 으로 Play의 displayPrice 그대로 표시 (현지화 자동).

### `usePurchasePro()` — 결제 mutation

Phase 1의 `usePurchaseBundle`과 동일 패턴. `bundleId: "pro"` 가상 키로 verify-purchase 호출. 순서 엄수: 게이트 → 결제 → 검증 → finishPurchase.

### `UpgradeScreen` — 가격 비교

```
┌─────────────────────────────┐
│ Flash Voca Pro              │
│                             │
│ Pro에서 누리는 혜택            │
│ • 추후 추가될 기능들           │
│ • 광고 없음                  │
│                             │
│ ┌─────────────────────────┐ │
│ │ 월간                     │ │
│ │ ₩4,900 / 월              │ │
│ │ [구독]                   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 연간 (17% 할인)           │ │
│ │ ₩49,000 / 년             │ │
│ │ [구독]                   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 평생                      │ │
│ │ ₩99,000 / 1회             │ │
│ │ [구매]                   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

라우팅: `app/upgrade.tsx` 신규.

### `ProMembershipCard` — 프로필 카드

활성 / 비활성에 따라 다른 UI:

**비활성 (`isPro = false`):**
```
┌─────────────────────────────┐
│ Flash Voca Pro              │
│ 모든 기능을 잠금 해제하세요.    │
│ [업그레이드 안내 보기]         │
└─────────────────────────────┘
```

**활성 구독 (`kind = subscription`):**
```
┌─────────────────────────────┐
│ ⭐ Pro 활성                   │
│ 다음 갱신: 2026-05-29          │
│ [Play Store에서 관리]          │
└─────────────────────────────┘
```

**활성 평생 (`kind = lifetime`):**
```
┌─────────────────────────────┐
│ ⭐ Pro 활성                   │
│ 평생 이용권                   │
└─────────────────────────────┘
```

### Play Store 딥링크

```ts
export function openPlaySubscriptionManagement(productId?: string) {
  const pkg = Application.applicationId ?? "com.kjstudio.flashvoca";
  const url = productId
    ? `https://play.google.com/store/account/subscriptions?sku=${productId}&package=${pkg}`
    : `https://play.google.com/store/account/subscriptions`;
  Linking.openURL(url);
}
```

> Play 정책상 구독 취소는 반드시 Play Store에서 — 우리 앱 안에서 직접 취소 불가능.

### `EntitlementRepository` 확장

`upsertCachedEntitlementAsync`가 새 컬럼 (`kind`, `auto_renewing`) 함께 저장하도록 SQL 수정.

## 환경변수

### 클라이언트 (`.env`)

```
EXPO_PUBLIC_PRO_PRODUCT_MONTHLY=flashvoca_pro_monthly
EXPO_PUBLIC_PRO_PRODUCT_YEARLY=flashvoca_pro_yearly
EXPO_PUBLIC_PRO_PRODUCT_LIFETIME=flashvoca_pro_lifetime
```

### Edge Function Secrets

```
PRO_PRODUCT_MONTHLY=...
PRO_PRODUCT_YEARLY=...
PRO_PRODUCT_LIFETIME=...
```

## i18n 키 (4 locale)

```
pro.title                    "Flash Voca Pro"
pro.heroDescription          "모든 기능을 잠금 해제하세요."
pro.benefits.adFree          "광고 없음"
pro.benefits.future          "추가 기능이 출시되는 대로 자동 사용 가능"
pro.plan.monthly             "월간"
pro.plan.yearly              "연간"
pro.plan.yearlyDiscount      "{{percent}}% 할인"
pro.plan.lifetime            "평생"
pro.plan.priceMonthly        "{{price}} / 월"
pro.plan.priceYearly         "{{price}} / 년"
pro.plan.priceLifetime       "{{price}} / 1회"
pro.subscribeButton          "구독"
pro.buyButton                "구매"
pro.activeStatus             "Pro 활성"
pro.nextRenewal              "다음 갱신: {{date}}"
pro.expiresOn                "{{date}}에 만료"
pro.lifetimeBadge            "평생 이용권"
pro.managePlay               "Play Store에서 관리"
pro.upgradeButton            "업그레이드 안내 보기"
errors.subscription.invalidState  "구독 상태가 정상이 아니에요. 잠시 후 다시 시도해 주세요."
```

## 분석 이벤트 추가

```ts
pro_upgrade_screen_viewed: { source: 'profile' | 'feature_gate' }
pro_purchase_started:      { productId, kind }
pro_purchase_succeeded:    { productId, kind }
pro_purchase_failed:       { productId, reason }
rtdn_subscription_received: { notificationType, status }
rtdn_voided_received:       { productType }
```

## 새 에러 분류

`verify-purchase` 응답에 추가:
- `subscription_invalid_state` (422) — `subscriptionState`가 ACTIVE도 GRACE도 아닌 경우

`pubsub-rtdn`은 외부에 에러 응답 안 보냄 (Pub/Sub은 5xx만 재전달). 내부 로깅만.

## 테스트 전략

기존 패턴 준수: 수동 mock, no `jest.mock()` for service tests.

### Edge Function 단위 테스트 (Deno)

`verify-purchase/__tests__/verifier.test.ts` — **확장**:
- 기존 5개 (Phase 1) 유지
- SUBS productId → `kind='subscription'`, `expires_at` 채워짐
- Pro INAPP (Lifetime) → `bundleId='pro'`, `kind='one_time'`
- Pro 상품인데 클라이언트가 보낸 `bundleId !== 'pro'` → 403
- SUBS 상태가 ACTIVE/GRACE 아니면 422

`pubsub-rtdn/__tests__/notificationHandler.test.ts` — **신규**:
- subscriptionState 7종 → status 매핑
- voidedPurchase → receipt='refunded' + entitlements='revoked'
- 영수증 lookup 실패 → no-op
- testNotification → no-op
- subscriptionsv2.get 실패 → throw (Pub/Sub 재시도)
- OIDC 토큰 검증 실패 → 401

### 클라이언트 Jest 테스트

- `PurchaseVerificationService.test.ts` 확장: Pro productId 보내면 `bundleId: 'pro'` 호출, `kind/autoRenewing/expiresAt` UPSERT
- `useProAccess.test.tsx` 신규: 7가지 status별 isPro 판정
- `runPurchasePro.test.ts` 신규: 결제 흐름 4 케이스 (Phase 1의 runPurchaseBundle 패턴)
- `SqliteEntitlementRepository.test.ts` 확장: 새 컬럼 저장

### Mock helpers
- `__tests__/helpers/MockPurchaseVerification.ts` 의 `createMockEntitlement`에 `kind: 'one_time'`, `autoRenewing: false` 기본값

## 외부 작업 체크리스트

### Google Play Console
- [ ] **인앱 상품**: `flashvoca_pro_lifetime` (한정형, 활성)
- [ ] **구독**: `flashvoca_pro_monthly` (Base plan: 월 갱신)
- [ ] **구독**: `flashvoca_pro_yearly` (Base plan: 연 갱신)
- [ ] License tester 그대로 사용 (Phase 1과 동일)

### Google Cloud Console
- [ ] **Pub/Sub** 활성화
- [ ] **Topic 생성**: `flashvoca-rtdn`
- [ ] **Push Subscription** 생성:
  - Endpoint: `https://<supabase>.supabase.co/functions/v1/pubsub-rtdn`
  - Authentication: Enable OIDC token, Service account: 기존 Phase 1 service account 재사용
- [ ] Service account에 **Pub/Sub Subscriber** 권한 부여 (Topic level)

### Play Console (RTDN 연결)
- [ ] **Monetization setup → Real-time developer notifications**
- [ ] Topic name: `projects/<gcp-project>/topics/flashvoca-rtdn`
- [ ] **Send test notification** → `pubsub-rtdn` 함수 로그에 testNotification 수신 확인

### Supabase
- [ ] 마이그레이션 적용: `202604290001_phase4_subscriptions.sql`
- [ ] Edge Function Secrets:
  - `PRO_PRODUCT_MONTHLY`, `PRO_PRODUCT_YEARLY`, `PRO_PRODUCT_LIFETIME`
- [ ] `supabase functions deploy verify-purchase` (재배포)
- [ ] `supabase functions deploy pubsub-rtdn` (신규)

### `.env`
- [ ] 위 3개 `EXPO_PUBLIC_PRO_PRODUCT_*` 추가

### `app.json`
- 변경 없음 — `expo-iap` plugin이 SUBS 처리 포함

## 수동 검증 시나리오

1. **첫 구독 (월간)**: License tester로 결제 → 프로필 카드 "⭐ Pro 활성" + "다음 갱신: ..." → Supabase `entitlements` 행 확인 (`kind='subscription'`, `auto_renewing=true`, `expires_at` 채워짐)
2. **Lifetime 구매**: UpgradeScreen → 평생 → 프로필 카드 "평생 이용권" → `kind='one_time'`, `expires_at=null`
3. **구독 취소 (Play Store)**: 프로필 카드 "Play Store에서 관리" → 취소 → 잠시 후 RTDN 도착 → `status='cancelled'`, `auto_renewing=false`. 만료 전까지 `isPro: true`.
4. **만료 시점**: Play Console에서 강제 만료 → RTDN EXPIRED → `status='expired'` → 클라이언트 다음 sync → `isPro: false`
5. **환불**: Play Console → Order management → 환불 → RTDN voidedPurchase → `purchase_receipts.status='refunded'`, `entitlements.status='revoked'` → `isPro: false`
6. **갱신 자동**: 월 구독 갱신 시점 → RTDN RENEWED → `expires_at` 다음 달로 연장 → 클라이언트는 변화 못 느낌 (계속 active)

## 성공 기준 (Done)

1. ✅ `npm run typecheck`, `npm run lint`, `npm test` 모두 통과
2. ✅ `supabase/migrations/202604290001_phase4_subscriptions.sql` 추가
3. ✅ `verify-purchase` Edge Function이 INAPP/SUBS 모두 검증
4. ✅ `pubsub-rtdn` Edge Function 배포 가능 상태 (`supabase functions deploy --dry-run`)
5. ✅ `useProAccess()` 훅이 7가지 status 모두 정확히 분류
6. ✅ UpgradeScreen에서 3종 상품 가격 정상 표시 (mock + 실 환경)
7. ✅ 프로필 카드가 비활성/활성구독/활성평생 3가지 상태에 맞게 UI 변경
8. ✅ Play Store 딥링크 작동
9. ✅ License tester 환경에서 시나리오 1~6 통과 (외부 작업 후)

## 분량 추정

작업 수 약 22개. Phase 1 + RTDN 추가 분량.

## 후속 단계

- **기능별 Pro 게이팅**: Phase 4 완료 후 deck sync / FSRS / 통계 등에 `if (!isPro) showUpgrade()` 단계적 추가
- **iOS Apple Subscriptions**: StoreKit + App Store Server Notifications + apple_product_id 컬럼 (별도 Phase)
- **Phase 1.5 (환불 webhook)**: Phase 4의 pubsub-rtdn에서 흡수됨 — 별도 단계 불필요
- **Phase 2b**: 유료 콘텐츠 서버 분리 + Storage signed URL
