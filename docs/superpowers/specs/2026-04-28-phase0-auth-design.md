# Phase 0 — 사용자 인증 도입 설계

작성일: 2026-04-28
상태: 설계 승인 대기

## 배경

flash-voca는 현재 모든 사용자 데이터를 `LOCAL_USER_ID = "local-user"` 하드코딩 상수로 SQLite에 저장합니다. Supabase 클라이언트는 환경변수 기반으로 선택적 연결되며, 카탈로그/엔타이틀먼트 **읽기 전용** 채널로만 사용됩니다. 향후 단계(Phase 1: 결제 보안, Phase 2: 사용자 콘텐츠 동기화)는 모두 안정적인 사용자 식별자를 전제로 합니다.

Phase 0은 이 전제를 충족하는 인증 기반을 구축합니다.

## 목표 / 비목표

### 목표
- 모든 데이터가 안정적인 `auth.uid()` 기반 식별자에 묶이도록 한다.
- 첫 실행 시 마찰 0 (즉시 사용 가능, 네트워크 의존 없음).
- 사용자가 원할 때 Google 계정으로 업그레이드할 수 있는 명시적 경로를 제공한다.
- 기존 `"local-user"` 데이터를 1회성 트랜잭션으로 새 uid에 이전한다.

### 비목표 (Phase 0 범위 외)
- 로그아웃 / 계정 전환
- 계정 삭제 (Play Store 출시 직전 별도 작업)
- 결제 시점 강제 게이트 (Phase 1)
- 다중 기기 데이터 머지 (Phase 2)
- 토큰 만료/세션 갱신 사용자 UX (Supabase 라이브러리 자동 처리에 의존)
- iOS Apple 로그인 (출시 결정 시점에 별도)
- 익명 계정 정리 정책 (Supabase 운영 측 작업)

## 핵심 결정사항

| 결정 | 채택안 |
|---|---|
| 인증 의무 수준 | **익명 우선** — 첫 실행 시 자동 익명 계정, 명시적 업그레이드 |
| 지원 Provider | **Google 만** (Android-first) |
| 기존 데이터 처리 | **자동 마이그레이션** (1회성, SQLite 트랜잭션) |
| 출시 상태 가정 | **개발 단계** — 실패 시 안전망 단순화 |
| 업그레이드 권유 시점 | **결제 시점 강제 + 프로필 화면 버튼** (강제는 Phase 1 영역) |
| 첫 실행 네트워크 실패 | **임시 로컬 uid 즉시 발급 + 백그라운드 rebind** |

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│ AppBootstrapGate                                    │
│   1. SQLite init (기존)                              │
│   2. AuthService.bootstrapAsync() ← 신규            │
│   3. Observability init (기존)                      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ AuthService (신규)                                   │
│   - getCurrentUserId(): string  (동기, 항상 반환)   │
│   - linkGoogleAsync(): Promise<void>                │
│   - subscribe(listener)                             │
└─────────────────────────────────────────────────────┘
        │              │                  │
        ▼              ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ LocalUserId  │ │ Supabase     │ │ MigrationRunner  │
│ Storage      │ │ Auth Client  │ │ (1회성)          │
│ (AsyncStor)  │ │              │ │                  │
└──────────────┘ └──────────────┘ └──────────────────┘
```

`AuthService`는 새 추상화 레이어이며, 앱의 모든 곳에서 `getCurrentUserId()`를 동기적으로 호출할 수 있도록 보장합니다(부트스트랩 완료 후 한정).

## 부트스트랩 흐름

```
앱 시작
  │
  ├─ AsyncStorage 에서 stored_user_id 읽기
  │   ├─ 있음 → 그대로 사용, 부트스트랩 완료
  │   └─ 없음 ↓
  │
  ├─ 1) 임시 로컬 uid 즉시 생성: `local-${randomUUID()}`
  │     AsyncStorage 저장
  │     SQLite 1회성 마이그레이션 실행 (LOCAL_USER_ID → 임시 uid)
  │     → 부트스트랩 완료 (즉시 앱 사용 가능)
  │
  └─ 2) 백그라운드에서 Supabase 익명 로그인 시도
        ├─ 성공 → rebind: SQLite UPDATE user_id 임시→supabase_uid
        │         AsyncStorage 갱신, listener 통지
        └─ 실패 → 사일런트, breadcrumb 기록
                  다음 앱 시작 시 stored uid가 `local-` 접두사면 재시도
```

## ID 상태 머신

| 상태 | userId 형태 | Supabase 세션 | 다음 전환 |
|---|---|---|---|
| `LOCAL_TEMP` | `local-<uuid>` | 없음 | 익명 로그인 성공 → `ANON` |
| `ANON` | Supabase 익명 uid | 익명 | Google linkIdentity → `LINKED` |
| `LINKED` | 동일 uid 유지 | Google | (Phase 0 범위 외) |

### 불변식
- 부트스트랩 완료 후 `getCurrentUserId()`는 절대 빈 값/null 반환 안 함
- ID 전환 시 SQLite의 모든 `user_id` 컬럼 UPDATE는 **단일 트랜잭션**
- rebind 실패 시 임시 uid 유지, 데이터 손실 없음

## 모듈 구성

### 신규 파일

```
src/core/services/auth/
  ├─ AuthService.ts              인터페이스 + 타입
  ├─ SupabaseAuthService.ts      실제 구현
  ├─ NoopAuthService.ts          env 미설정 빌드 / 테스트용
  ├─ authMigration.ts            LOCAL_USER_ID → 새 uid 1회성 이전
  └─ userIdStorage.ts            AsyncStorage 래퍼

src/core/services/auth/google/
  └─ GoogleSignInClient.ts       @react-native-google-signin 래퍼

src/core/errors/AuthError.ts     AuthError 카테고리

src/features/profile/components/
  └─ AccountLinkCard.tsx         "Google 계정 연결" UI
```

### 변경 파일

```
src/core/config/constants.ts                 LOCAL_USER_ID 제거
src/core/services/createAppServices.ts       authService 추가
src/app/AppProviders.tsx                     useAppServices 에 노출
src/app/bootstrap/AppBootstrapGate.tsx       authService.bootstrapAsync() 호출
src/core/observability/eventRegistry.ts      auth_* 이벤트 추가
src/shared/i18n/locales/{en,ko,ja,zh}.json   auth 키 추가
src/features/profile/screens/ProfileScreen.tsx  AccountLinkCard 삽입
src/core/repositories/sqlite/*.ts            LOCAL_USER_ID 참조 → authService 주입
```

## 인터페이스 계약

### `AuthService`

```ts
export type AuthState =
  | { kind: "local-temp"; userId: string }
  | { kind: "anonymous"; userId: string }
  | { kind: "linked"; userId: string; provider: "google"; email: string | null };

export interface AuthService {
  bootstrapAsync(): Promise<void>;
  getCurrentUserId(): string;
  getState(): AuthState;
  linkGoogleAsync(): Promise<void>;
  subscribe(listener: (state: AuthState) => void): () => void;
}
```

### 계약 규칙
- `bootstrapAsync()`는 `AppBootstrapGate`에서 1회만 호출
- `getCurrentUserId()`는 동기, throw 안 함, 항상 비어있지 않은 문자열 반환
- `linkGoogleAsync()`는 사용자 명시 트리거 시에만 호출
- `subscribe()`로 상태 변화 구독 → React 측 `useAuthState()` 훅으로 노출

### Supabase 호출 매핑

| AuthService 동작 | Supabase API |
|---|---|
| 익명 로그인 (rebind 단계) | `supabase.auth.signInAnonymously()` |
| Google 연결 | `supabase.auth.signInWithIdToken({ provider: 'google', token })` — 익명 세션 생존 시 자동으로 동일 uid 유지 |
| 세션 복구 | `supabase.auth.getSession()` — 라이브러리 자동 처리 |

## 마이그레이션

### `LOCAL_USER_ID` → 첫 임시 uid

- 처음 임시 uid 생성 시 단일 SQLite 트랜잭션에서 실행
- 모든 `user_id` 컬럼을 가진 테이블에 UPDATE 적용 (`decks`, `cards`, `study_sessions`, `cached_entitlements`, `pending_sync_operations` 등 — 구현 시 schema.ts 기준 전수 조사)
- 완료 후 AsyncStorage에 `auth_migration_v1_done` 플래그 저장
- 플래그 있으면 이후 부트스트랩에서 스킵
- 개발 단계 가정: 실패 시 로그만, 별도 복구 UI 없음

### `LOCAL_TEMP` → `ANON` rebind

- Supabase 익명 로그인 성공 시 같은 패턴의 트랜잭션 UPDATE
- AsyncStorage `stored_user_id` 갱신
- listener 통지 (TanStack Query 무효화 등 React 측 후처리)

## 에러 분류

`AuthError.ts`에 `AppError` 확장 4종 추가:

| 클래스 | 발생 지점 | messageKey | 처리 |
|---|---|---|---|
| `AuthBootstrapError` | AsyncStorage 읽기/쓰기 실패 | `errors.auth.bootstrap` | 토스트 + 재시작 권유 |
| `GoogleLinkError` | 토큰 획득/Supabase 호출 실패 | `errors.auth.googleLink` | 토스트, 재시도 가능 |
| `IdentityConflictError` | Google 계정이 다른 uid에 이미 연결 | `errors.auth.identityConflict` | 안내 토스트 |
| `MigrationError` | LOCAL_USER_ID UPDATE 실패 | `errors.auth.migration` | 로그만 |

Supabase raw error는 항상 위 분류 레이어를 거쳐 매핑.

### Google linkIdentity 충돌 정책

이미 그 Google 계정이 다른 uid에 묶여 있으면 Supabase가 에러 반환 → `IdentityConflictError` 토스트만. 실제 머지 흐름은 Phase 2(동기화 도입)에서. Phase 0 시점엔 클라우드에 데이터가 거의 없어 충돌 발생 빈도 매우 낮음.

## 분석 이벤트 (eventRegistry 추가)

```ts
auth_anonymous_created:    { userId }
auth_rebind_completed:     { fromUserId, toUserId }
auth_google_link_started:  {}
auth_google_linked:        { userId }
auth_link_failed:          { reason: "cancelled" | "conflict" | "network" | "unknown" }
```

## i18n 키 (4 locale 모두)

```
auth.linkCard.title           "Google 계정 연결"
auth.linkCard.description     "데이터 백업과 구매 보호를 위해 Google 계정을 연결하세요."
auth.linkCard.button          "Google로 연결"
auth.linkCard.linkedAs        "{{email}} 로 연결됨"
errors.auth.bootstrap         "앱 초기화에 실패했어요. 다시 시작해 주세요."
errors.auth.googleLink        "Google 연결에 실패했어요. 잠시 후 다시 시도해 주세요."
errors.auth.identityConflict  "이 Google 계정은 이미 다른 사용자와 연결되어 있어요."
errors.auth.migration         "데이터 이전 중 문제가 생겼어요."
```

## 라이브러리 선택

**`@react-native-google-signin/google-signin`** 채택
- Expo 54 prebuild 환경에서 안정적
- ID token 획득 → `supabase.auth.signInWithIdToken` 연결
- `expo-auth-session` 대안은 웹 OAuth 흐름이라 Android UX 떨어짐

## 테스트 전략

기존 패턴 준수: 인터페이스 기반 수동 mock, `jest.mock()` 미사용.

### 신규 테스트

```
__tests__/services/auth/
  ├─ AuthService.test.ts           상태 머신, rebind, 마이그레이션
  ├─ authMigration.test.ts         트랜잭션 검증
  └─ helpers/MockAuthService.ts
```

### 검증 항목
- 부트스트랩: stored uid 없음 → 임시 uid 발급 + AsyncStorage 저장
- 부트스트랩: stored uid 있음 → 그대로 사용, 마이그레이션 스킵
- rebind: 임시 uid → Supabase 익명 uid SQLite UPDATE 트랜잭션 적용
- rebind 실패: 임시 uid 유지, 사일런트, breadcrumb 기록
- linkGoogle 성공: state `linked` 전환, listener 호출
- linkGoogle 충돌: `IdentityConflictError`
- `getCurrentUserId()` 부트스트랩 전 호출 시 throw (불변식)
- 마이그레이션: LOCAL_USER_ID 데이터 일괄 UPDATE / no-op / 1회성 플래그 / 트랜잭션 rollback

### 기존 테스트 영향
- `LOCAL_USER_ID` 참조 레포지토리 테스트 → `MockAuthService` 주입으로 교체
- helpers/factories.ts 에 `createMockAuthState()` 추가
- helpers/mockRepositories.ts 시그니처 업데이트

## 성공 기준 (Done Definition)

1. `npm run typecheck`, `npm run lint`, `npm test` 모두 통과
2. `LOCAL_USER_ID` 상수 코드베이스에서 완전히 제거 (`grep` 0건)
3. env 설정된 빌드 첫 실행 시 임시 uid → Supabase anon uid rebind 완료, AsyncStorage 저장
4. env 미설정 빌드에서도 앱 정상 작동 (영구 임시 uid 유지)
5. 프로필 화면의 "Google 계정 연결" 카드 동작 (다이얼로그 → 연결 후 email 표시)
6. 같은 빌드 재시작 시 stored uid 유지, 재로그인 불필요
7. 익명 사용자가 만든 덱이 Google 연결 후에도 그대로 보임 (uid 동일)

## 외부 작업 체크리스트 (코드 외)

- [ ] Supabase 프로젝트 Auth 설정에서 **익명 로그인 활성화**
- [ ] Supabase Auth Providers에서 **Google** 활성화 + Web/Android Client ID 등록
- [ ] Google Cloud Console에서 OAuth 2.0 Client ID 생성, Android용 SHA-1 등록
- [ ] `.env`에 추가:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [ ] `app.json` / Expo prebuild config에 `@react-native-google-signin/google-signin` plugin 추가

## 후속 단계

Phase 0 완료 후:
- **Phase 1**: 결제 보안 (Play Billing 연동, 영수증 서버 검증, 유료 콘텐츠 서버 분리)
- **Phase 2**: 사용자 콘텐츠 동기화 (decks/cards 양방향, pending_sync_operations 워커)
- **Phase 3**: 학습 진행도 동기화
