# 외부 설정 가이드 (Phase 0–2)

flash-voca의 코드는 모두 작성되었지만, 실제 동작을 위해서는 Supabase / Google Cloud / Google Play Console / EAS 등 **외부 서비스 설정이 필요**합니다. 이 문서는 그 모든 단계를 한 자리에 모은 체크리스트입니다.

> 작성일: 2026-04-28
> 대상: Phase 0 (인증), Phase 1 (결제), Phase 2 (콘텐츠 동기화) 모두 적용된 코드베이스

---

## 개요 — 무엇을 어디서 하나

| 단계 | 서비스 | 핵심 작업 | 대상 Phase |
|---|---|---|---|
| 1 | Supabase | 프로젝트 생성 + 익명 로그인 활성화 | Phase 0 |
| 2 | Google Cloud Console | OAuth Client 2개 (Web + Android) | Phase 0 |
| 3 | Supabase | Google provider 등록 | Phase 0 |
| 4 | Supabase | DB 마이그레이션 적용 (Phase 0/1/2 SQL) | Phase 0/1/2 |
| 5 | Google Play Console | 앱 등록 + IAP 상품 + license tester | Phase 1 |
| 6 | Google Cloud Console | Service Account 생성 (Play API 호출용) | Phase 1 |
| 7 | Supabase | Edge Function Secrets 설정 + 배포 | Phase 1 |
| 8 | Supabase | `bundles.play_product_id` 채우기 | Phase 1 |
| 9 | EAS / Local | dev build → 디바이스 설치 | 통합 검증 |

소요 시간: 처음 셋업 시 **반나절~하루**. Play Console 검토는 별도로 1~3일 소요될 수 있어 병렬로 진행 권장.

---

## 1단계 — Supabase 프로젝트 생성

### 1.1 프로젝트 만들기

1. https://supabase.com 접속 → 회원가입 (GitHub 로그인 권장)
2. **New project** 클릭
   - Name: `flash-voca` 또는 원하는 이름
   - Database password: 강력한 비밀번호 (안전한 곳에 보관)
   - Region: 사용자 가까운 곳 (한국 사용자라면 `ap-northeast-2 Seoul`)
3. 프로젝트 생성 완료 후 **Settings → API** 페이지에서 다음 값 메모:
   - `Project URL` (예: `https://oszxauvrqyjpqiknxoqc.supabase.co`)
   - `anon public key`
   - `service_role secret` (절대 클라이언트 코드에 넣지 말 것 — Edge Function 전용)

### 1.2 익명 로그인 활성화

1. **Authentication → Providers** 페이지
2. **Email** 토글 → 보통은 켜두지만 우리 앱은 안 씀
3. 페이지 위쪽 **Anonymous Sign-Ins** 토글을 **ON**
4. Save

> 익명 로그인이 꺼져 있으면 Phase 0의 `signInAnonymously` 호출이 실패합니다.

### 1.3 환경변수 클라이언트에 등록

프로젝트 루트에 `.env` 파일 생성 (없으면):

```env
EXPO_PUBLIC_SUPABASE_URL=https://oszxauvrqyjpqiknxoqc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<1.1에서 얻은 anon public key>
```

> `service_role secret`은 절대 `.env`에 두지 마세요. 그 키는 Edge Function 전용입니다.

---

## 2단계 — Google Cloud Console (OAuth Client)

Phase 0 Google 로그인 + Phase 1 Play API 호출에 모두 필요합니다.

### 2.1 프로젝트 생성

1. https://console.cloud.google.com → 새 프로젝트 만들기
2. 프로젝트 이름: `flash-voca` 등

### 2.2 OAuth 동의 화면 설정

1. **APIs & Services → OAuth consent screen**
2. User Type: **External** (Play Store 출시 시 필수)
3. App name, User support email, Developer contact 입력
4. **Scopes**: 기본만 OK (`openid`, `email`, `profile`)
5. **Test users**: 본인 Google 이메일 추가 (출시 전 단계에서 필요)
6. Save

### 2.3 OAuth Web Client 생성 (Supabase가 사용)

1. **APIs & Services → Credentials → CREATE CREDENTIALS → OAuth client ID**
2. Application type: **Web application**
3. Name: `flash-voca-supabase-web`
4. **Authorized redirect URIs**에 추가:
   ```
   https://oszxauvrqyjpqiknxoqc.supabase.co/auth/v1/callback
   ```
   (URL의 프로젝트 ref 부분은 본인 Supabase URL로 교체)
5. CREATE → 다음 값 메모:
   - `Client ID`
   - `Client Secret`

### 2.4 OAuth Android Client 생성 (앱이 사용)

Android 네이티브 Google Sign-In은 Web client와 별개의 Android client가 필요합니다.

1. **CREATE CREDENTIALS → OAuth client ID**
2. Application type: **Android**
3. Name: `flash-voca-android`
4. **Package name**: `app.json`의 `expo.android.package` 값 (예: `com.kjstudio.flashvoca`)
5. **SHA-1 certificate fingerprint** 필요 — 두 가지 방법:

   **방법 A. EAS dev build의 fingerprint**:
   ```bash
   eas credentials -p android
   ```
   → `Keystore: View configuration` → `SHA1 Fingerprint` 복사

   **방법 B. 로컬 디버그 keystore (Expo Go가 아니라 prebuild 사용 시)**:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
   ```

6. CREATE → Client ID 메모

> 출시용 prod build와 dev build는 SHA-1이 다릅니다. dev/prod 각각 별도 Android Client를 추가하거나 같은 client에 SHA-1 두 개를 모두 등록하세요.

### 2.5 환경변수 추가

`.env`에 추가:
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<2.3에서 얻은 Web Client ID>
```

> Android Client ID는 코드에 직접 넣지 않습니다. `app.json` plugin 설정과 패키지명 + SHA-1 매칭으로 자동 동작.

---

## 3단계 — Supabase에 Google provider 등록

1. Supabase 대시보드 → **Authentication → Providers**
2. **Google** 토글 ON
3. 입력란에:
   - `Client ID (for OAuth)`: 2.3에서 얻은 **Web** Client ID
   - `Client Secret (for OAuth)`: 2.3에서 얻은 Web Client Secret
4. **Authorized Client IDs** 입력란이 있다면 (안드로이드 ID Token 검증용):
   - 2.4에서 얻은 **Android** Client ID 추가
   - 2.3의 **Web** Client ID도 추가
5. Save

---

## 4단계 — Supabase 마이그레이션 적용

코드 안의 SQL을 실제 DB에 반영해야 합니다.

### 4.1 적용할 마이그레이션 파일

```
supabase/migrations/
├── 202604240001_public_catalog.sql        (기존 — Phase 1 이전)
├── 202604240002_seed_public_catalog.sql   (기존)
├── 202604280001_phase1_billing.sql        (Phase 1)
└── 202604280002_phase2_deck_sync.sql      (Phase 2)
```

### 4.2 적용 방법 — 두 가지 옵션

**옵션 A. Supabase CLI (권장)**

```bash
# 처음 한 번만
npm install -g supabase
supabase login
supabase link --project-ref <프로젝트ref>

# 마이그레이션 push
supabase db push
```

**옵션 B. 대시보드 SQL Editor**

각 `.sql` 파일 내용을 복사해서 **SQL Editor** 페이지에 붙여넣고 RUN.

### 4.3 적용 검증

대시보드 **Database → Tables**에서 다음 테이블이 보이는지 확인:

| 테이블 | Phase | RLS |
|---|---|---|
| `bundles` | (기존) + `play_product_id` 컬럼 | enabled |
| `bundle_items` | (기존) | — |
| `official_decks` | (기존) | — |
| `entitlements` | Phase 1 | enabled |
| `purchase_receipts` | Phase 1 | enabled |
| `user_decks` | Phase 2 | enabled |
| `user_deck_cards` | Phase 2 | enabled |

**Database → Triggers**에서 다음 트리거 확인:
- `user_decks_lww`
- `user_deck_cards_lww`
- `user_deck_cards_touch_parent`

---

## 5단계 — Google Play Console (Phase 1)

### 5.1 가입 + 앱 등록

1. https://play.google.com/console → 개발자 계정 가입 ($25 USD, 1회)
2. **앱 만들기** → 이름 / 기본 언어 / 앱·게임 / 무료·유료
3. 신규 앱 페이지에서 좌측 메뉴 **테스트 → 내부 테스트** 선택
4. **새 버전 만들기** — 이 시점에는 빌드가 없어도 됩니다 (5.4에서 EAS dev build 업로드)

### 5.2 IAP 상품 등록

1. 좌측 메뉴 **수익 창출 → 인앱 상품 → 인앱 상품**
2. **상품 만들기** 클릭
3. 입력:
   - **상품 ID**: `voca_pack_travel_2026` 등 (한 번 만들면 변경 불가)
   - 이름 / 설명
   - 가격
4. **활성** 상태로 저장
5. 최소 1개는 만들어야 결제 흐름 테스트 가능

### 5.3 License tester 등록

1. **설정 → 라이선스 테스트** 페이지 (Play Console 좌측 하단)
2. License tester 이메일 추가 (자기 자신 + 테스트 디바이스에 로그인된 Google 계정들)
3. 라이선스 응답: **응답: LICENSED**
4. 저장

> License tester로 등록된 계정은 IAP를 **실제 결제 없이** 테스트할 수 있습니다 (테스트 카드 표시).

### 5.4 EAS dev build 업로드 (선택, 내부 테스트 트랙 활성화용)

상품을 등록해도 앱이 한 번이라도 트랙에 출시되어야 IAP가 활성화됩니다.

```bash
# 처음 한 번만
npm install -g eas-cli
eas login
eas build:configure

# Android 내부 테스트 빌드
eas build -p android --profile preview
```

빌드 완료 후 `.aab` 파일을 Play Console **내부 테스트 → 새 버전 만들기**에 업로드 → 검토 통과 시 IAP 활성화.

---

## 6단계 — Service Account (Phase 1 Edge Function)

Edge Function이 Google Play Developer API를 호출해서 영수증을 검증하려면 service account 인증이 필요합니다.

### 6.1 Service Account 생성

1. Google Cloud Console (2단계의 같은 프로젝트) → **IAM & Admin → Service Accounts**
2. **CREATE SERVICE ACCOUNT**
3. Name: `flash-voca-play-verifier`
4. CREATE AND CONTINUE → **Role**: 비워두고 **DONE** (다음 단계에서 Play Console에서 권한 부여)

### 6.2 JSON 키 다운로드

1. 만든 service account 클릭 → **KEYS** 탭
2. **ADD KEY → Create new key → JSON**
3. 다운로드된 JSON 파일을 안전한 곳에 보관 (한 번만 다운로드 가능)

### 6.3 Play Console에서 service account 권한 부여

1. Play Console → **설정 → API 액세스** 페이지
2. 새 service account가 표시되는지 확인 (자동 감지). 안 보이면 잠시 기다린 후 새로고침.
3. 이름 옆 **권한 부여** 클릭
4. **앱 권한**: flash-voca 앱 추가
5. **계정 권한**:
   - **Financial data, orders, and cancellation survey responses 보기** ✅
6. 적용 → 사용자 초대

> 권한이 활성화되기까지 **최대 24시간** 소요될 수 있습니다.

---

## 7단계 — Edge Function 배포 (Phase 1)

### 7.1 Secrets 설정

Supabase 대시보드 → **Edge Functions → Manage secrets** (또는 CLI):

```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/<service-account>.json)"
supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.kjstudio.flashvoca
```

대시보드 사용 시:
- Key: `GOOGLE_SERVICE_ACCOUNT_JSON` / Value: JSON 파일 내용 전체 (그대로 붙여넣기)
- Key: `GOOGLE_PLAY_PACKAGE_NAME` / Value: 앱의 패키지명

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`는 Supabase가 자동 주입하므로 설정 불필요.

### 7.2 Edge Function 배포

```bash
supabase functions deploy verify-purchase
```

배포 후 대시보드 **Edge Functions** 페이지에서 `verify-purchase`가 활성 상태로 보이는지 확인.

### 7.3 동작 테스트 (선택)

License tester 디바이스에서 결제 후 Supabase 로그를 확인:

```bash
supabase functions logs verify-purchase --tail
```

또는 대시보드 **Edge Functions → verify-purchase → Logs** 페이지.

---

## 8단계 — `bundles.play_product_id` 채우기

서버 catalog에 등록된 bundle을 실제 Play 상품 ID에 연결.

### 8.1 SQL Editor에서 직접

Supabase **SQL Editor**:

```sql
UPDATE bundles
   SET play_product_id = 'voca_pack_travel_2026'
 WHERE id = 'bundle_travel_basics';
```

`bundle_id`와 `play_product_id`는 본인이 등록한 값으로 교체. 매핑 안 된 bundle은 클라이언트에서 구매 버튼이 비활성화됩니다.

### 8.2 검증

```sql
SELECT id, title, play_product_id, is_published FROM bundles;
```

매핑된 bundle만 결제 흐름에 진입할 수 있습니다.

---

## 9단계 — 앱 설정 (`app.json`) + 빌드

### 9.1 `app.json` 확인

다음 plugin이 등록되어 있어야 합니다 (이미 코드에 추가됨):

```json
{
  "expo": {
    "plugins": [
      ["expo-router", { "root": "./app" }],
      "expo-font",
      "expo-localization",
      ["expo-image-picker", { "photosPermission": "..." }],
      "expo-iap"
    ]
  }
}
```

### 9.2 Android 패키지명 + SHA-1 일치 확인

`app.json`의 `expo.android.package`가 2.4의 OAuth Android Client에 등록한 패키지명과 일치해야 합니다.

### 9.3 dev build

```bash
# 처음 한 번 또는 plugin/native 변경 후
eas build -p android --profile development

# 또는 expo prebuild + 로컬 빌드
npx expo prebuild --platform android
npx expo run:android
```

> Play Billing은 **Expo Go에서 동작하지 않습니다.** EAS dev build 또는 prebuild 후 디바이스 설치 필수.

### 9.4 디바이스에 설치

- EAS dev build: 빌드 완료 페이지의 QR로 설치
- 로컬: `adb install ./android/app/build/outputs/apk/release/app-release.apk` 또는 USB 디버깅으로 자동 설치

---

## 통합 검증 시나리오

### 시나리오 A — Phase 0 (인증)

1. License tester Google 계정으로 로그인된 디바이스에서 앱 첫 실행
2. **Supabase 대시보드 → Authentication → Users** 페이지에서 새 익명 사용자 생성됨 확인
3. 앱 재시작 → 새 사용자 추가 안 됨 (stored uid 재사용)
4. 프로필 화면 → "Google로 연결" 버튼 → Google 다이얼로그 → 성공
5. Authentication → Users 페이지에서 그 사용자에 Google identity 추가됨 확인 (`is_anonymous: false`로 변경)
6. 익명 시점에 만든 deck이 연결 후에도 그대로 보임 (uid 동일)

### 시나리오 B — Phase 1 (결제)

1. 위 1~5 완료 후 (linked 상태)
2. 스토어 → bundle → "구매하기" → Play 결제 다이얼로그 (License tester면 "테스트 카드" 표시)
3. 결제 성공 → 화면 잠금 해제
4. **Supabase 대시보드 → Table Editor**:
   - `purchase_receipts`에 1행 추가
   - `entitlements`에 1행 추가 (`status='active'`)
5. 앱 재시작 → 잠금 유지 (cached_entitlements 캐시 동작)
6. 앱 데이터 삭제 → 다시 같은 Google로 로그인 → 프로필 → "구매 복원" → 잠금 자동 복구

### 시나리오 C — Phase 2 (콘텐츠 sync)

1. 기기 A에서 deck 1개 + 카드 3장 만들기
2. 프로필 → "지금 동기화" → 토스트 "동기화를 완료했어요"
3. **Supabase Table Editor → user_decks / user_deck_cards** 행 확인
4. 기기 B (같은 Google 계정 로그인) 첫 실행 → 부트스트랩 sync
5. 기기 B의 덱 목록에 그 deck 등장
6. 기기 A에서 카드 1장 삭제 → "지금 동기화" → 기기 B "지금 동기화" → 동일하게 사라짐
7. 기기 A 오프라인에서 카드 추가 → 비행기 모드 해제 → "지금 동기화" → 큐 flush

### 시나리오 D — RLS 보안 (수동 SQL 검증)

```sql
-- service_role로 실행하지 말고 anon/authenticated 컨텍스트로:
-- Table Editor에서 직접 INSERT 시도

INSERT INTO entitlements (user_id, bundle_id, provider, provider_ref)
VALUES ('<다른 사용자 uid>', 'bundle_x', 'google_play', 'fake_token');
-- → "new row violates row-level security policy" 에러 → 차단 성공
```

---

## 트러블슈팅

### "auth/operation-not-allowed" — 익명 로그인 실패
→ Supabase **Authentication → Providers → Anonymous Sign-Ins** 토글 확인 (1.2 단계).

### Google 로그인 후 "AuthApiError: Unsupported provider"
→ 3단계 (Supabase에 Google provider 등록)가 누락. Web Client ID/Secret 확인.

### Google 로그인 시 "DEVELOPER_ERROR" / 코드 10
→ Android Client의 SHA-1 fingerprint가 안 맞음. 2.4에서 등록한 SHA-1과 실제 빌드의 SHA-1 비교. dev build와 prod build 각각 따로 등록 필요.

### `verify-purchase` 호출 시 401 `not_linked`
→ 사용자가 익명 상태에서 결제 시도. Phase 0 Google 연결 확인. 또는 토큰 만료 — 앱 재시작.

### `verify-purchase` 호출 시 500 `verification_failed`
→ Supabase `Edge Functions → Logs` 확인. 가장 흔한 원인:
- Service account 권한이 아직 안 활성화 (최대 24시간 대기)
- `GOOGLE_SERVICE_ACCOUNT_JSON` secret이 잘못 저장됨 (JSON 파일 전체 내용을 그대로 넣어야 함)
- `GOOGLE_PLAY_PACKAGE_NAME`이 실제 앱과 다름

### Phase 2 sync는 작동하는데 LWW 트리거가 동작 안 함
→ 4.3에서 트리거 3종 확인. 누락되었으면 `202604280002_phase2_deck_sync.sql` 재적용.

### "Caution: i18next also has a named export" 경고
→ 무해한 lint 경고. 무시.

### Play Console에서 IAP 상품 활성화 안 됨
→ 앱이 트랙에 한 번도 출시 안 됨. 5.4에서 dev build를 내부 테스트 트랙에 업로드.

---

## 진행 체크리스트 (요약)

복사해서 본인 진행 상황 추적용:

```
Phase 0 (인증)
[ ] Supabase 프로젝트 생성
[ ] Anonymous Sign-Ins 활성화
[ ] Google Cloud Console OAuth Web Client
[ ] Google Cloud Console OAuth Android Client (SHA-1 등록)
[ ] Supabase Google provider 등록
[ ] .env 파일에 SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID

Phase 1 (결제)
[ ] Play Console 가입 ($25)
[ ] 앱 등록 (internal testing 트랙)
[ ] IAP 상품 1개 이상 등록
[ ] License tester 이메일 등록
[ ] Service Account 생성 + JSON 키 다운로드
[ ] Play Console에서 Service Account에 권한 부여
[ ] Supabase Edge Function Secrets: GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_PACKAGE_NAME
[ ] supabase functions deploy verify-purchase
[ ] bundles.play_product_id UPDATE

Phase 0/1/2 공통
[ ] supabase/migrations/* 적용 (db push 또는 SQL Editor)
[ ] Tables, RLS, Triggers 적용 검증
[ ] EAS dev build → 디바이스 설치
[ ] 시나리오 A/B/C 수동 검증
```

---

## 참고

- Supabase 문서: https://supabase.com/docs
- Google Play Billing: https://developer.android.com/google/play/billing
- expo-iap: https://github.com/hyochan/expo-iap
- @react-native-google-signin: https://react-native-google-signin.github.io/

문제 발생 시 spec/plan 문서 참고:
- `docs/superpowers/specs/2026-04-28-phase0-auth-design.md`
- `docs/superpowers/specs/2026-04-28-phase1-billing-design.md`
- `docs/superpowers/specs/2026-04-28-phase2-deck-sync-design.md`
