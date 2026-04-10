# Error Management System Design

## Overview

Flash Voca 앱 전체에 걸친 에러 관리 시스템. 사용자 대면 토스트 UI와 개발자용 구조화된 콘솔 로깅을 통합하여 일관된 에러 처리를 제공한다.

## Goals

- 계층적 커스텀 에러 클래스로 에러를 분류하고 식별한다.
- 구조화된 로컬 콘솔 로거로 디버깅 효율을 높인다.
- 토스트 UI로 사용자에게 비파괴적 에러 알림을 제공한다.
- TanStack Query 글로벌 핸들러로 mutation 에러를 자동 처리한다.
- 기존 코드 전체를 새 에러 시스템으로 마이그레이션한다.

## Non-Goals

- 외부 크래시 리포팅 서비스(Sentry 등) 연동
- 자동 재시도(retry) 메커니즘
- Query(조회) 에러의 글로벌 처리 (화면별 인라인 처리 유지)

---

## 1. Error Class Hierarchy

### 파일 구조

```
src/core/errors/
├── AppError.ts
├── DatabaseError.ts
├── NetworkError.ts
├── UnknownError.ts
└── index.ts
```

### Base Class

```ts
// src/core/errors/AppError.ts
export abstract class AppError extends Error {
  abstract readonly category: string;
  abstract readonly userMessage: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(message: string, options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.context = options?.context;
    this.timestamp = new Date().toISOString();
  }
}
```

### Database Errors

```ts
// src/core/errors/DatabaseError.ts
export abstract class DatabaseError extends AppError {
  readonly category = "database";
}

export class DeckSaveError extends DatabaseError {
  readonly userMessage = "덱 저장에 실패했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Deck save failed", options);
  }
}

export class DeckDeleteError extends DatabaseError {
  readonly userMessage = "덱 삭제에 실패했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Deck delete failed", options);
  }
}

export class DeckNotFoundError extends DatabaseError {
  readonly userMessage = "덱을 찾을 수 없습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Deck not found", options);
  }
}

export class StudyRecordError extends DatabaseError {
  readonly userMessage = "학습 기록 저장에 실패했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Study record save failed", options);
  }
}

export class BootstrapError extends DatabaseError {
  readonly userMessage = "앱 초기화에 실패했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("App bootstrap failed", options);
  }
}

export class BundleQueryError extends DatabaseError {
  readonly userMessage = "번들 정보를 불러올 수 없습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Bundle query failed", options);
  }
}

export class EntitlementCacheError extends DatabaseError {
  readonly userMessage = "구매 캐시 처리에 실패했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Entitlement cache operation failed", options);
  }
}
```

### Network Errors

```ts
// src/core/errors/NetworkError.ts
export abstract class NetworkError extends AppError {
  readonly category = "network";
}

export class SyncError extends NetworkError {
  readonly userMessage = "동기화에 실패했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Sync failed", options);
  }
}

export class EntitlementFetchError extends NetworkError {
  readonly userMessage = "구매 정보를 불러올 수 없습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Entitlement fetch failed", options);
  }
}
```

### Unknown Error

```ts
// src/core/errors/UnknownError.ts
export class UnknownError extends AppError {
  readonly category = "unknown";
  readonly userMessage = "알 수 없는 오류가 발생했습니다.";
  constructor(options?: { context?: Record<string, unknown>; cause?: unknown }) {
    super("Unknown error", options);
  }
}
```

---

## 2. Structured Logger

### 파일

```
src/core/errors/logger.ts
```

### Design

```ts
enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(appError: AppError): void;
};
```

### Behavior

- `logger.error(appError)` — AppError의 필드를 `LogEntry`로 변환 후 `console.error(JSON.stringify(entry, null, 2))` 출력.
- `logger.debug/info/warn` — 범용 로깅. `{ level, category: "app", message, context, timestamp }` 형식으로 출력. 각각 `console.debug`, `console.info`, `console.warn` 사용.

---

## 3. Toast UI System

### 파일 구조

```
src/shared/ui/toast/
├── ToastProvider.tsx
├── ToastContainer.tsx
└── index.ts
```

### Interface

```ts
interface Toast {
  id: string;
  message: string;
  duration?: number;  // default 3000ms
}

interface ToastContext {
  show(message: string, duration?: number): void;
}

function useToast(): ToastContext;
```

### Behavior

- `ToastProvider`가 `AppProviders.tsx`에 추가된다.
- 토스트는 화면 하단에 표시되고 `duration` 후 자동 사라짐.
- 동시 최대 3개까지 스택 표시.
- 간단한 fade-in/out 애니메이션 (React Native `Animated` API 사용).
- `useTheme().colors`를 사용해 다크모드 대응.
- 비에러 알림(예: "덱이 저장되었습니다")에도 범용으로 사용 가능.

---

## 4. Global Error Handler

### 파일

```
src/core/errors/handleError.ts
```

### Design

```ts
// 원본 에러를 AppError로 변환
function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new UnknownError({ context: { originalMessage: error.message }, cause: error });
  }
  return new UnknownError({ context: { rawValue: String(error) } });
}

// 로거 + 토스트를 연결
function createErrorHandler(toast: ToastContext) {
  return function handleError(error: unknown): void {
    const appError = normalizeError(error);
    logger.error(appError);
    toast.show(appError.userMessage);
  };
}
```

### TanStack Query Integration

```ts
// AppProviders.tsx
const { show } = useToast();
const handleError = createErrorHandler({ show });

const queryClient = new QueryClient({
  defaultOptions: {
    mutation: {
      onError: handleError,
    },
  },
});
```

- Mutation 에러만 글로벌 처리. Query 에러는 각 화면에서 `isError`로 인라인 처리 유지.
- 개별 mutation에서 추가 로직이 필요하면 로컬 `onError`도 사용 가능 (글로벌 핸들러가 먼저 실행됨).

---

## 5. Migration Plan

### Repository Layer — try-catch로 커스텀 에러 감싸기

| 파일 | 변경 |
|------|------|
| `SqliteDeckRepository.saveDeckAsync` | 기존 `throw new Error("Deck save failed")` → `throw new DeckSaveError({ context: { deckId } })`. DB 트랜잭션 전체를 try-catch로 감싸서 예상치 못한 SQLite 에러도 `DeckSaveError`로 변환. |
| `SqliteDeckRepository.deleteDeckAsync` | try-catch 추가 → `throw new DeckDeleteError({ context: { deckId }, cause: error })` |
| `SqliteStudyRepository.logReviewAsync` | try-catch 추가 → `throw new StudyRecordError({ context: { deckId, cardId }, cause: error })` |
| `SqliteBundleRepository` | `listBundlesAsync`, `getBundleByIdAsync`를 try-catch로 감싸서 `BundleQueryError`로 변환. |
| `SqliteEntitlementRepository` | `replaceCachedEntitlementsAsync`, `clearCachedEntitlementsAsync`를 try-catch로 감싸서 `EntitlementCacheError`로 변환. 읽기 전용 메서드(`listActiveEntitlementsAsync`, `hasBundleAccessAsync`)도 동일하게 감싸기. |
| `SupabaseEntitlementGateway` | try-catch → `throw new EntitlementFetchError({ cause: error })` |

### Service Layer — 대부분 변경 없음

Service는 Repository를 그대로 호출하는 얇은 레이어. Repository에서 적절한 에러를 throw하면 그대로 전파됨.

예외: `BootstrapService.prepareAppAsync()` — try-catch로 `BootstrapError` 감싸기. `AppBootstrapGate`에서 글로벌 토스트가 아닌 풀스크린 에러 화면으로 처리.

### Screen Layer — 개별 에러 처리 제거

| 파일 | 변경 |
|------|------|
| `StudyScreen.tsx` | `recordReview`의 로컬 `onError` 콜백 제거. 글로벌 핸들러가 처리. |
| `useStudySession.ts` | `lastError` 상태, `onError` 콜백 관련 코드 제거. `RecordReviewParams`에서 `onError` 필드 제거. |
| `AppBootstrapGate.tsx` | 유지. 부트스트랩 에러는 글로벌 토스트가 아닌 풀스크린 에러 화면. 단, catch 블록에서 `BootstrapError`의 `userMessage`를 활용하도록 변경. |
| `AppProviders.tsx` | `ToastProvider` 추가, `QueryClient`에 글로벌 `mutation.onError` 연결. |

### Query 에러 인라인 처리 유지

`StudyScreen`의 `studyQuery.isError` 분기는 유지. 단, 에러 메시지 추출을 `instanceof AppError` 체크로 개선:

```ts
{studyQuery.isError ? (
  <Panel>
    <Badge tone="accent">Error</Badge>
    <Text>
      {studyQuery.error instanceof AppError
        ? studyQuery.error.userMessage
        : "학습 데이터를 불러올 수 없습니다."}
    </Text>
  </Panel>
) : null}
```

---

## 6. Testing

- 각 에러 클래스의 `instanceof` 체크, `category`, `userMessage`, `context` 검증.
- `logger.error`가 올바른 `LogEntry` 형식으로 출력하는지 검증 (`console.error` spy).
- `normalizeError`가 다양한 입력(AppError, Error, string, undefined)을 올바르게 변환하는지 검증.
- `createErrorHandler`가 로거와 토스트를 모두 호출하는지 검증.
- 기존 서비스 테스트에서 커스텀 에러 타입 throw 여부 검증 추가.
