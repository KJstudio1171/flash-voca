# Phase 1 — 결제 보안 설계

작성일: 2026-04-28
상태: 설계 승인 대기
선행 단계: Phase 0 (인증) 완료

## 배경

flash-voca는 현재 `NoopBillingGateway`로 결제 호출 시 예외만 던지고, `cached_entitlements` 로컬 테이블만으로 잠금을 판정합니다. 이 구조는 사용자가 SQLite를 조작하면 유료 콘텐츠가 무단 해제되는 보안 결함이 있습니다.

Phase 1은 **결제를 안전하게 동작시키고, 권한 판정의 권위를 서버로 옮기는 것**을 목표로 합니다.

## 목표 / 비목표

### 목표
- Play Billing으로 실제 구매가 동작한다.
- 영수증을 서버 측에서 Google Play Developer API로 검증한다.
- `entitlements`는 Edge Function만이 INSERT/UPDATE 할 수 있다 (RLS).
- 결제 시점에 `linked` 상태(Google 등 어떤 provider든)가 강제된다.
- 사용자가 다른 기기에서 "구매 복원"으로 entitlement을 회복할 수 있다.

### 비목표 (Phase 1 범위 외)
- iOS / App Store 결제 (별도 Phase)
- 구독 모델 — 일회성(INAPP)만
- 환불 RTDN webhook 처리 (Phase 1.5)
- 유료 콘텐츠 자체를 서버로 이전 (Phase 2 영역)
- Storage signed URL 발급 (Phase 2)
- 영수증 재검증 백그라운드 작업
- Play Integrity API (변조 차단)
- iOS Apple 로그인 등 추가 provider

## 핵심 결정사항

| 결정 | 채택안 |
|---|---|
| 범위 | 결제 핵심만 (Play Billing + Edge Function 검증 + RLS + 인증 게이트 + 복원) |
| 구매 모델 | **일회성 (INAPP)** 영구 소유, 구독 미지원 |
| RN 결제 라이브러리 | **`expo-iap`** (Expo 54 공식) |
| 서버 로직 위치 | **Supabase Edge Functions** (Deno) |
| bundle ↔ product 매핑 | **`bundles.play_product_id` 컬럼 추가** |
| Play Console 상태 | 미등록 — Phase 1과 병렬로 사용자가 등록 |
| 검증 전략 | **코드/Edge Function까지 작성, e2e는 Play 등록 후 사용자 수동** |
| 인증 게이트 | **`state.kind === "linked"` 강제** (provider-agnostic) |
| acknowledge 위치 | **클라이언트** (`expo-iap.finishTransaction`) |

## 아키텍처

### 신뢰 모델

```
Google Play (돈/영수증 발행, 진실의 원천)
        │ 영수증 토큰
        ▼
앱 (expo-iap)  ──── purchaseToken ────▶  Supabase Edge Function
        │                                         │
        │                                         │ Google Play Developer API
        │                                         ▼
        │                                    영수증 검증
        │                                         │ OK
        │                                         ▼
        │                                    entitlements INSERT (service role)
        │                                         │
        │ ◀──────────── pull ─────────── Supabase entitlements (RLS: own rows only)
        ▼
로컬 cached_entitlements (UI 캐시, 신뢰 근거 아님)
```

### 핵심 원칙

> **"클라이언트는 의도를 보낸다. 권한은 서버가 결정한다."**

- 클라이언트는 `entitlements`에 직접 쓸 수 없다 (RLS로 INSERT 차단).
- Edge Function만이 service role로 INSERT/UPDATE 한다.
- Edge Function은 Google API에 영수증을 검증한 뒤에만 권한을 발급한다.
- 클라이언트의 `cached_entitlements`는 화면 표시용 캐시일 뿐, 잠금 해제 판정 근거가 아니다.

### 결제 시점 인증 게이트

Phase 0의 익명 사용자는 자유롭게 앱을 쓸 수 있지만, **구매 시점에는 `linked` 상태가 필수**:
- Google이 환불 처리 시 사용자 식별 가능해야 함
- 기기 변경 후 구매 복원이 익명 uid로는 어려움
- 어드민/CS 대응 시 사용자 특정 가능

게이트 로직은 provider-agnostic. 미래에 Apple/이메일 provider가 추가되면 그 사용자도 자동으로 통과.

## 데이터 모델

### Supabase 신규 테이블 1: `purchase_receipts`

영수증 감사 + 멱등성 키 보관용.

```sql
CREATE TABLE purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_play')),
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  raw_response JSONB,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'refunded'))
);

CREATE INDEX idx_purchase_receipts_user ON purchase_receipts(user_id);
```

`purchase_token UNIQUE` → 같은 영수증을 두 번 검증해도 중복이 생기지 않음.

### Supabase 신규 테이블 2: `entitlements`

```sql
CREATE TABLE entitlements (
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

CREATE INDEX idx_entitlements_user_status ON entitlements(user_id, status);
```

`UNIQUE (user_id, bundle_id, provider)` → 한 사용자가 같은 번들을 두 번 사도 한 행만 유지.

### `bundles` 테이블 변경

```sql
ALTER TABLE bundles ADD COLUMN play_product_id TEXT UNIQUE;
```

`play_product_id`가 null인 bundle은 클라이언트에서 구매 버튼이 비활성화된다.

### RLS 정책

```sql
-- entitlements: SELECT-own only
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY entitlements_select_own ON entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- purchase_receipts: 클라이언트 접근 불가, service_role만
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;

-- bundles: 공개 카탈로그 SELECT
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY bundles_public_read ON bundles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);
```

INSERT/UPDATE/DELETE 정책은 service_role만 사용 — RLS bypass.

### 로컬 SQLite 변경

기존 `cached_entitlements`는 그대로 유지 (캐시 역할). `bundles` 로컬 테이블에도 `play_product_id` 컬럼 추가 (CatalogSyncService가 함께 가져옴).

## Edge Function: `verify-purchase`

### 위치

```
supabase/
  functions/
    verify-purchase/
      index.ts
      googlePlayClient.ts
      verifier.ts
      types.ts
  config.toml
```

### 환경변수

- `GOOGLE_SERVICE_ACCOUNT_JSON` — Service Account JSON 전체
- `GOOGLE_PLAY_PACKAGE_NAME` — `com.kjstudio.flashvoca` 등
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase 자동 주입

### HTTP 계약

**요청:**
```http
POST /functions/v1/verify-purchase
Authorization: Bearer <Supabase user JWT>
Content-Type: application/json

{
  "bundleId": "bundle_travel_basics",
  "productId": "voca_pack_travel_2026",
  "purchaseToken": "abc..."
}
```

`bundleId`는 옵셔널. 복원 흐름에서는 클라이언트가 bundle을 모를 수 있으므로 서버가 `productId`로 `bundles` 테이블 lookup을 시도한다.

**성공 (200):**
```json
{
  "entitlement": {
    "id": "...",
    "userId": "...",
    "bundleId": "bundle_travel_basics",
    "provider": "google_play",
    "providerRef": "abc...",
    "status": "active",
    "grantedAt": "2026-04-28T...",
    "expiresAt": null
  }
}
```

**에러:**

| HTTP | code | 의미 |
|---|---|---|
| 401 | `unauthenticated` | JWT 없음/만료 |
| 401 | `not_linked` | 익명 사용자 (linked 아님) |
| 400 | `invalid_request` | 필드 누락 |
| 403 | `bundle_product_mismatch` | bundleId의 play_product_id가 productId와 다름 |
| 404 | `bundle_not_found` | productId로 lookup 실패 |
| 422 | `receipt_invalid` | Google 검증 실패 (purchaseState !== 0) |
| 409 | `receipt_already_used` | 다른 user_id에 이미 사용된 영수증 |
| 500 | `verification_failed` | Google API 호출 자체 실패 |

### 검증 로직 순서

1. JWT 검증 → user_id 추출 (없거나 익명이면 401)
2. 입력 파싱 (필드 누락 시 400)
3. bundleId 있으면 해당 bundle의 `play_product_id` 조회 → productId와 다르면 403
4. bundleId 없으면 productId로 bundle lookup → 없으면 404
5. `purchase_receipts`에서 `purchase_token`으로 기존 행 조회. 다른 user_id가 사용 중이면 409
6. Google Play Developer API 호출 (`purchases.products.get`). `purchaseState !== 0`이면 422
7. `purchase_receipts` UPSERT (onConflict: purchase_token)
8. `entitlements` UPSERT (onConflict: user_id+bundle_id+provider)
9. 클라이언트에 entitlement 응답
10. 클라이언트가 별도로 `expo-iap.finishTransaction` 호출 (acknowledge)

### 보안 체크리스트

- ✅ Supabase JWT 검증 (anon/익명 거부)
- ✅ bundle ↔ product 매핑 서버 측 재확인
- ✅ 영수증 도용 차단 (다른 user_id 사용 시 409)
- ✅ Google API 호출 결과만 신뢰
- ✅ raw_response 저장 (사후 분쟁 증거)

## 클라이언트 모듈

### 신규 파일

```
src/core/services/billing/
  ├─ ExpoIapBillingGateway.ts         expo-iap 기반 BillingGateway 구현
  ├─ PurchaseVerificationService.ts   Edge Function 호출 + 로컬 캐시 갱신
  ├─ NoopPurchaseVerificationService.ts  env 미설정 폴백
  └─ types.ts                         Product, PurchaseResult 타입

src/features/store/hooks/
  ├─ usePurchaseBundle.ts
  ├─ useRestorePurchases.ts
  └─ useAuthGatedAction.ts            "linked" 강제 헬퍼

src/features/store/components/
  └─ AccountRequiredModal.tsx

src/core/errors/BillingError.ts
```

### `BillingGateway` 시그니처 변경

기존 인터페이스는 `purchaseBundleAsync(bundleId)` 같이 도메인 친화적이었으나, Gateway는 결제 플랫폼 어댑터 역할만 가져야 한다. 새 시그니처:

```ts
export interface PurchaseResult {
  productId: string;
  purchaseToken: string;
}

export interface BillingGateway {
  initializeAsync(): Promise<void>;
  fetchProductsAsync(productIds: string[]): Promise<Product[]>;
  purchaseProductAsync(productId: string): Promise<PurchaseResult>;
  finishPurchaseAsync(purchaseToken: string): Promise<void>;
  queryActivePurchasesAsync(): Promise<PurchaseResult[]>;
}
```

`bundleId` ↔ `productId` 매핑은 한 단계 위(`PurchaseVerificationService` 또는 `usePurchaseBundle`) 책임.

### 통합 흐름 — `usePurchaseBundle`

```ts
mutationFn: async (bundle: Bundle) => {
  if (!bundle.playProductId) throw new BillingProductMissingError();
  await ensureLinked();                                            // 1
  const result = await billingGateway.purchaseProductAsync(...);   // 2
  const entitlement = await purchaseVerification.verifyAsync({...}); // 3
  await billingGateway.finishPurchaseAsync(result.purchaseToken);  // 4
  return entitlement;
}
```

**순서가 중요**: 검증 성공(3) **후에만** acknowledge(4). 검증 실패 시 acknowledge 안 하면 Play가 자동 환불 처리.

### `useAuthGatedAction`

`state.kind !== "linked"`이면 `AccountRequiredModal` 노출 → 확인 시 `linkGoogleAsync()` → 성공 시 mutation 진행. 사용자가 모달을 취소하면 `AuthGateCancelledError` throw (조용히 중단, 토스트 없음).

Promise 기반 게이트로 어떤 mutation에서도 재사용 가능하게 설계.

### 구매 복원

프로필 화면 "구매 복원" 버튼:
1. `billingGateway.queryActivePurchasesAsync()` — Play에 등록된 활성 구매들 가져오기
2. 각 영수증을 `verifyAsync({ productId, purchaseToken })` 으로 서버에 재검증 (`bundleId`는 옵셔널)
3. `Promise.allSettled`로 일부 실패해도 나머지 진행
4. 활성 구매가 0개면 "복원할 구매가 없어요" 토스트

## 에러 분류 (`BillingError.ts`)

기존 `AppError` 확장 패턴 따름.

| 클래스 | 발생 지점 | messageKey | UI 처리 |
|---|---|---|---|
| `BillingInitError` | expo-iap 초기화 실패 | `errors.billing.init` | 토스트 |
| `BillingProductMissingError` | bundle.play_product_id null | `errors.billing.productMissing` | 토스트 |
| `BillingPurchaseCancelledError` | 사용자가 결제 취소 | (없음) | 무시 |
| `BillingPurchaseFailedError` | Play 결제 자체 실패 | `errors.billing.purchaseFailed` | 토스트 |
| `BillingVerificationError` | Edge Function 검증 실패 | `errors.billing.verificationFailed` | 토스트 + 안내 |
| `AuthGateCancelledError` | 사용자가 계정 연결 모달 취소 | (없음) | 무시 |

원칙: 사용자가 능동적으로 취소한 경우는 토스트를 띄우지 않는다 (마찰 최소화).

## 분석 이벤트 추가

```ts
billing_purchase_started:   { bundleId, productId }
billing_purchase_succeeded: { bundleId, productId }
billing_purchase_failed:    { bundleId, reason }
billing_restore_started:    {}
billing_restore_completed:  { restoredCount }
billing_auth_gate_blocked:  { bundleId }
```

## i18n 키 (4 locale 모두)

```
billing.accountRequired.title       "계정 연결이 필요해요"
billing.accountRequired.description "구매 보호와 환불을 위해 Google 계정 연결이 필요합니다."
billing.accountRequired.confirm     "연결하기"
billing.accountRequired.cancel      "취소"
billing.purchasing                  "구매 중..."
billing.restoring                   "복원 중..."
billing.restoreEmpty                "복원할 구매가 없어요."
billing.restoreCompleted            "{{count}}개 구매를 복원했어요."
errors.billing.init                 "결제 시스템 초기화에 실패했어요."
errors.billing.productMissing       "이 번들은 아직 판매 중이 아니에요."
errors.billing.purchaseFailed       "결제에 실패했어요. 잠시 후 다시 시도해 주세요."
errors.billing.verificationFailed   "구매 확인에 실패했어요. 자동 환불될 수 있어요."
```

## 테스트 전략

기존 패턴 준수 (수동 mock).

### 신규 Jest 테스트
- `__tests__/services/billing/PurchaseVerificationService.test.ts`
- `__tests__/features/store/hooks/usePurchaseBundle.test.tsx`
- `__tests__/features/store/hooks/useRestorePurchases.test.tsx`

### Mock helpers
- `__tests__/helpers/MockBillingGateway.ts`
- `__tests__/helpers/MockPurchaseVerification.ts`

### 검증 항목
- linked 상태 → 게이트 통과 → 결제 → 검증 → finishPurchase 순서
- non-linked 상태 → 모달 노출 → 사용자 확인 → linkGoogle → 결제 진행
- non-linked 상태 → 모달 취소 → 결제 시작도 안 됨
- 검증 실패 시 finishPurchase 호출 안 됨
- bundle.playProductId === null → BillingProductMissingError
- 복원 흐름: N개 구매 → N번 verify → entitlements 갱신
- 복원: 일부 실패해도 나머지 진행 (Promise.allSettled)
- 복원: 0개 구매 → empty toast

### Edge Function 테스트 (Deno)
`supabase/functions/verify-purchase/__tests__/verifier.test.ts`
- bundle ↔ product 매핑 불일치 → 403
- 다른 user_id 영수증 재사용 → 409
- Google API mock `purchaseState !== 0` → 422
- 정상 흐름 → entitlement 반환 + UPSERT 호출 검증

Google API 호출은 의존성 주입(`googlePlayClient` 인터페이스)으로 mock 가능하게 설계.

## 성공 기준 (Done Definition)

1. `npm run typecheck`, `npm run lint`, `npm test` 모두 통과
2. Edge Function `supabase functions deploy --dry-run verify-purchase` 통과
3. `cached_entitlements` 클라이언트 단독 INSERT → RLS로 거부 (수동 SQL 검증)
4. Mock 환경에서 전체 구매 흐름 단위 테스트 통과
5. 신규 에러 6종이 토스트/i18n 적절히 매핑
6. 익명 사용자 구매 시도 → 계정 연결 모달
7. `bundles.play_product_id` null → 구매 버튼 비활성화

## 외부 작업 체크리스트 (Phase 1 동작에 필수)

- [ ] **Google Play Console** 가입 ($25 등록비)
- [ ] flash-voca 앱을 Play Console에 등록 (internal testing 트랙)
- [ ] **IAP 상품** 1개 이상 등록 (한정형, 활성)
- [ ] **License tester** 이메일 등록 (Settings → License testing)
- [ ] **Service Account** 생성 (Google Cloud Console)
  - Play Console에서 service account에 "View financial data, orders" 권한 부여
  - JSON 키 다운로드
- [ ] Supabase 대시보드 → Edge Functions → Secrets:
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_PLAY_PACKAGE_NAME`
- [ ] Supabase 마이그레이션 실행 (`entitlements`, `purchase_receipts`, `bundles.play_product_id`)
- [ ] DB의 `bundles.play_product_id`를 실제 IAP 상품 ID로 채움
- [ ] `app.json`에 `expo-iap` plugin 추가
- [ ] EAS dev build 또는 prebuild → 디바이스 설치 (Play Billing은 expo-go 미지원)

## 수동 e2e 시나리오 (사용자가 외부 작업 완료 후 수행)

1. License tester 디바이스에서 익명 사용자로 구매 시도 → "계정 연결" 모달 표시
2. Google 연결 후 구매 → Play 다이얼로그 → 성공 → bundle unlock
3. Supabase 대시보드에서 `entitlements`, `purchase_receipts` 행 확인
4. 앱 재시작 → 잠금 유지 (cached_entitlements 캐시 동작)
5. 앱 데이터 삭제 → 같은 Google 계정 로그인 → "구매 복원" → 잠금 자동 복구
6. 같은 영수증을 다른 계정에서 재시도 → 409 차단

## 후속 단계

- **Phase 1.5**: 환불 RTDN webhook + Play Integrity API
- **Phase 2**: 사용자 콘텐츠 동기화 (decks/cards) + 유료 콘텐츠 서버 분리 + Storage signed URL
- **Phase 3**: 학습 진행도(SRS) 동기화
- **별도 Phase**: iOS / App Store 결제 (StoreKit + Apple 영수증 검증)
- **별도 Phase**: 구독 모델
