# Observability Foundation Design

## Overview

Flash Voca 앱의 관측성(observability) 인프라. 에러 리포팅 채널과 제품 분석 채널을 분리된 API로 제공하되, 컨텍스트 주입·PII 스크러빙·동의 관리·설치 ID를 공유 프리미티브로 구성한다. 이번 범위는 **인터페이스와 프라이버시 기반만** 수립하고, 외부 벤더 연동·동의 UI·원격 전송은 후속 작업으로 분리한다.

이 설계는 기존 에러 관리 시스템(`2026-04-10-error-management-design.md`)에서 명시적으로 Non-Goal로 남긴 "외부 크래시 리포팅 연동"의 토대를 마련한다.

## Goals

- 에러 보고(`reportError`)와 분석 이벤트(`track`)를 분리된 채널로 제공한다.
- PII 유출을 구조적으로 차단한다 — 화이트리스트 스크러빙, 타입 레벨 이벤트 레지스트리.
- 동의(consent) 기반 전송 게이트를 채널별로 둔다 — PIPA·GDPR opt-in 원칙 준수.
- 브레드크럼 버퍼로 에러 발생 직전 사용자 동작 맥락을 첨부한다.
- 전역 에러 캡처 3경로(RN 핸들러, Promise rejection, React ErrorBoundary)를 리포터로 수렴시킨다.
- 벤더 교체가 `initializeObservability()` 인자 수정 1곳으로 끝나는 경계를 만든다.

## Non-Goals

- 외부 벤더(Sentry / PostHog / Firebase 등) 연동 — 선정·구현 모두 이번 범위 밖.
- 원격 싱크 구현 — `ConsoleSink`만 제공.
- 첫 실행 동의 프롬프트 / 설정 화면 동의 토글 UI — 저장소와 API만.
- Play Console Data Safety 선언 문서 — 벤더 확정 후.
- 국외 이전 동의 문구 — 벤더 리전 결정 후.
- 오프라인 버퍼링 / 재시도 / 레이트 리밋 — `RemoteSink` 추가 시 설계.
- 세션 리플레이 / 성능 트레이싱 / 네트워크 모니터링.
- 분석 이벤트 전체 카탈로그 — 시드 5개만 실제 호출부 연결, 레지스트리는 필요시 확장.

---

## 1. Architecture Overview

### 레이어

```
호출부 (Screen / Service / handleError)
   │
   ├─ errorReporter.report(appError)      ← ErrorReporter 채널
   │    └→ Breadcrumb 버퍼 스냅샷 첨부
   │    └→ ContextEnricher → scrubErrorContext → ConsentStore 체크 → ErrorSink
   │
   └─ analytics.track(name, props)         ← Analytics 채널
        └→ Breadcrumb 버퍼에 복제 기록 (동의 무관, 메모리 only)
        └→ ContextEnricher → scrubAnalyticsProperties → ConsentStore 체크 → AnalyticsSink
```

### 파일 구조

```
src/core/observability/
├── index.ts                         # public exports, 모듈 싱글톤 초기화
├── types.ts                         # ErrorReport, AnalyticsEvent, Breadcrumb, Sink 인터페이스
├── errorReporter.ts                 # ErrorReporter 클래스
├── analytics.ts                     # Analytics 클래스
├── breadcrumbBuffer.ts              # 메모리 링 버퍼
├── contextEnricher.ts               # installId / appVersion / OS / locale / sessionId 주입
├── scrub.ts                         # 화이트리스트 스크러빙 (에러 + 분석)
├── consent.ts                       # ConsentStore (app_meta 영속화)
├── installId.ts                     # 익명 설치 UUID 발급/로드
├── eventRegistry.ts                 # 분석 이벤트 타입 + 허용 속성
├── sinks/
│   ├── ConsoleErrorSink.ts
│   ├── ConsoleAnalyticsSink.ts
│   └── NoopSink.ts                  # 테스트용
└── globalHandler.ts                 # ErrorUtils / Promise rejection / ErrorBoundary 훅
```

### 기존 코드와의 관계

- `src/core/errors/logger.ts` — 유지하되 `error()` 메서드 제거. `debug/info/warn`은 `__DEV__` 가드 하에 남김.
- `src/core/errors/handleError.ts` — `createErrorHandler(toast, errorReporter)`로 시그니처 확장. `logger.error` 호출을 `errorReporter.report`로 교체.
- `src/core/services/createAppServices.ts` — 변경 없음. 관측성은 서비스 DI가 아니라 모듈 싱글톤.
- `src/app/bootstrap/AppBootstrapGate.tsx` — DB 초기화 직후 `initializeObservability()` 호출, 그 다음 `installGlobalErrorHandler()` 호출.
- `src/app/AppProviders.tsx` — 최상위 트리를 `ObservabilityErrorBoundary`로 감쌈. `createErrorHandler`에 `getErrorReporter()` 주입.

### DI 전달

관측성 프리미티브는 **모듈 최상위 싱글톤**으로 둔다. 이유:
- `handleError` · TanStack Query 글로벌 핸들러 · `ErrorUtils.setGlobalHandler` 등 비-React 경로에서도 접근 필요.
- `LocaleService` 같은 일반 서비스 DI보다 부트 시점이 빠름.

테스트에서 교체 가능하도록 `initializeObservability(config)`로 초기화하고 `resetObservabilityForTests()`로 비운다.

---

## 2. Core Types

```ts
// src/core/observability/types.ts

export type ObservabilityContext = {
  installId: string;
  appVersion: string;
  platform: "android" | "ios" | "web";
  osVersion: string;
  locale: string;
  sessionId: string;
  userId?: string;
};

export type ErrorReport = {
  name: string;
  category: string;
  message: string;
  userMessage: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
  cause?: { name: string; message: string };
  breadcrumbs: Breadcrumb[];
  observability: ObservabilityContext;
};

export type AnalyticsValue = string | number | boolean | null;

export type AnalyticsEvent = {
  name: string;
  timestamp: string;
  properties?: Record<string, AnalyticsValue>;
  observability: ObservabilityContext;
};

export type Breadcrumb = {
  timestamp: string;
  kind: "event" | "navigation" | "info";
  name: string;
  properties?: Record<string, AnalyticsValue>;
};

export interface ErrorSink {
  report(report: ErrorReport): Promise<void>;
}

export interface AnalyticsSink {
  track(event: AnalyticsEvent): Promise<void>;
}
```

### 타입 설계 결정

1. **`AnalyticsValue`를 원시값으로 제한** — PostHog / Mixpanel / Amplitude 공통 교집합. 객체 통째로 넣어 PII가 유출되는 사고를 구조적으로 차단.
2. **`properties`(분석) vs `context`(에러) 네이밍 분리** — 업계 관용어와 기존 `AppError.context` 일관성을 각각 따름.
3. **`ObservabilityContext`가 각 레코드에 인라인** — `ContextEnricher`가 전송 직전에 주입. 호출부는 몰라도 됨.
4. **`Breadcrumb.kind` 3종 고정** — 남발 방지. 필요 시 추가.
5. **`Sink.report/track`이 `Promise<void>`** — 현재 동기지만 미래 `RemoteSink` 대비. 실패는 싱크 내부에서 처리, 호출부는 fire-and-forget.

---

## 3. Shared Primitives

### 3.1 InstallId

```ts
// src/core/observability/installId.ts
import { randomUUID } from "expo-crypto";
import { getDatabaseAsync } from "@/src/core/database/client";

export async function getOrCreateInstallId(): Promise<string> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'install_id'`,
  );
  if (row?.value) return row.value;
  const id = randomUUID();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('install_id', ?)`,
    id,
  );
  return id;
}
```

- 기존 `app_meta` 테이블 재사용 (테마 설정과 동일 패턴).
- 앱 삭제 시 소멸 — PIPA "보유 기간" 관점에서 자연스러움.
- 광고 ID / 디바이스 고유 ID 미사용.

### 3.2 ContextEnricher

```ts
// src/core/observability/contextEnricher.ts
export class ContextEnricher {
  constructor(
    private readonly installId: string,
    private readonly appVersion: string,
    private readonly platform: "android" | "ios" | "web",
    private readonly osVersion: string,
    private readonly getLocale: () => string,
    private readonly sessionId: string,
  ) {}

  build(userId?: string): ObservabilityContext {
    return {
      installId: this.installId,
      appVersion: this.appVersion,
      platform: this.platform,
      osVersion: this.osVersion,
      locale: this.getLocale(),
      sessionId: this.sessionId,
      userId,
    };
  }
}
```

- 앱 부트 시 한 번 생성, 싱글톤.
- `appVersion` / `platform` / `osVersion`은 `expo-application` · `react-native`의 `Platform`에서 읽음.
- `getLocale`이 함수인 이유: 런타임 언어 변경 대응.
- `sessionId`는 부트 시 UUID 발급, 앱 재실행마다 새로.

### 3.3 Scrubbing

```ts
// src/core/observability/scrub.ts

const ALLOWED_ERROR_CONTEXT_KEYS = new Set<string>([
  // 식별자
  "deckId", "cardId", "bundleId", "userId", "sessionId",
  // 연산 메타
  "operation", "repository", "method",
  // 네트워크
  "httpStatus", "code", "url",
  // 성능·재시도
  "retryCount", "elapsedMs", "attemptCount",
]);

const STRING_MAX_LEN = 200;

function sanitizeValue(v: unknown): unknown {
  if (v === null || typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v === "string") return v.length > STRING_MAX_LEN ? v.slice(0, STRING_MAX_LEN) : v;
  return "[redacted]";
}

export function scrubErrorContext(
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_ERROR_CONTEXT_KEYS.has(k)) continue;
    out[k] = sanitizeValue(v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function scrubAnalyticsProperties<N extends AnalyticsEventName>(
  eventName: N,
  raw: Record<string, unknown> | undefined,
): Record<string, AnalyticsValue> | undefined {
  if (!raw) return undefined;
  const allowed = new Set(analyticsEventRegistry[eventName].allowedProps as readonly string[]);
  const out: Record<string, AnalyticsValue> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k)) continue;
    const sanitized = sanitizeValue(v);
    if (sanitized === null || ["string", "number", "boolean"].includes(typeof sanitized)) {
      out[k] = sanitized as AnalyticsValue;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
```

### 설계 결정

- **블랙리스트가 아닌 화이트리스트**: 새 호출부가 실수로 `deckName`을 넣어도 자동 탈락. 안전-기본값.
- **분석 스크러빙은 이벤트 이름별 레지스트리 매칭**: 에러보다 더 엄격.
- **문자열 200자 제한, 중첩 객체·배열은 `[redacted]`**: ID·코드·플래그 수준만 통과.

### 3.4 ConsentStore

```ts
// src/core/observability/consent.ts
export type ConsentChannels = {
  errorReports: boolean;
  analytics: boolean;
};

export class ConsentStore {
  async load(): Promise<ConsentChannels> {
    // app_meta에서 consent_error_reports, consent_analytics 조회
    // 기본값 둘 다 false
  }
  async setErrorReports(enabled: boolean): Promise<void> { /* ... */ }
  async setAnalytics(enabled: boolean): Promise<void> { /* ... */ }
  async hasDecided(): Promise<boolean> {
    // consent_decided_at이 있으면 true
  }
  async markDecided(): Promise<void> { /* now ISO 저장 */ }
}
```

- 기본값 둘 다 **`false`** (PIPA opt-in 원칙).
- 채널 독립 — 에러만 허용 / 분석 거부 가능.
- 이번 범위는 저장소와 API만. 실제 UI는 후속 작업.

### 3.5 Storage Schema

`app_meta` 테이블에 키 4개 추가 (기존 key-value 테이블 재사용, 마이그레이션 불필요):

| 키 | 값 |
|---|---|
| `install_id` | UUID |
| `consent_error_reports` | `"true"` / `"false"` / 없음 |
| `consent_analytics` | `"true"` / `"false"` / 없음 |
| `consent_decided_at` | ISO timestamp (있으면 `hasDecided()=true`) |

---

## 4. Channel APIs

### 4.1 BreadcrumbBuffer

```ts
// src/core/observability/breadcrumbBuffer.ts
export class BreadcrumbBuffer {
  private readonly items: Breadcrumb[] = [];
  constructor(private readonly capacity: number = 50) {}

  push(crumb: Breadcrumb): void {
    this.items.push(crumb);
    if (this.items.length > this.capacity) this.items.shift();
  }

  snapshot(): Breadcrumb[] { return [...this.items]; }
  clear(): void { this.items.length = 0; }
}
```

- 순수 메모리, 프로세스 재시작 시 소멸.
- `Analytics.track()`이 내부적으로 여기에도 기록 → 에러 발생 시 `ErrorReporter`가 스냅샷 첨부.

### 4.2 ErrorReporter

```ts
// src/core/observability/errorReporter.ts
export class ErrorReporter {
  constructor(
    private readonly sink: ErrorSink,
    private readonly enricher: ContextEnricher,
    private readonly breadcrumbs: BreadcrumbBuffer,
    private readonly consent: ConsentStore,
  ) {}

  async report(appError: AppError, userId?: string): Promise<void> {
    // 개발 빌드는 동의 게이트 우회 (ConsoleSink만 붙어있으므로 외부 수집 없음)
    if (!__DEV__) {
      const consent = await this.consent.load();
      if (!consent.errorReports) return;
    }

    const report: ErrorReport = {
      name: appError.name,
      category: appError.category,
      message: appError.message,
      userMessage: appError.userMessage,
      timestamp: appError.timestamp,
      context: scrubErrorContext(appError.context),
      stack: appError.stack,
      cause: extractCauseInfo(appError.cause),
      breadcrumbs: this.breadcrumbs.snapshot(),
      observability: this.enricher.build(userId),
    };

    try {
      await this.sink.report(report);
    } catch {
      // 싱크 실패 조용히 무시 — 리포트 중 재귀 방지
    }
  }
}

function extractCauseInfo(cause: unknown): { name: string; message: string } | undefined {
  if (cause instanceof Error) return { name: cause.name, message: cause.message };
  return undefined;
}
```

### 4.3 Event Registry + Analytics

```ts
// src/core/observability/eventRegistry.ts
export const analyticsEventRegistry = {
  app_opened: {
    allowedProps: [] as const,
  },
  deck_created: {
    allowedProps: ["cardCount", "isCustom"] as const,
  },
  deck_deleted: {
    allowedProps: ["cardCount"] as const,
  },
  study_session_started: {
    allowedProps: ["deckId", "sessionMode"] as const,
  },
  study_session_completed: {
    allowedProps: ["deckId", "cardsStudied", "durationSec", "correctRate"] as const,
  },
} satisfies Record<string, { allowedProps: readonly string[] }>;

export type AnalyticsEventName = keyof typeof analyticsEventRegistry;
type PropsOf<N extends AnalyticsEventName> = Partial<
  Record<(typeof analyticsEventRegistry)[N]["allowedProps"][number], AnalyticsValue>
>;
```

```ts
// src/core/observability/analytics.ts
export class Analytics {
  constructor(
    private readonly sink: AnalyticsSink,
    private readonly enricher: ContextEnricher,
    private readonly breadcrumbs: BreadcrumbBuffer,
    private readonly consent: ConsentStore,
  ) {}

  async track<N extends AnalyticsEventName>(name: N, properties?: PropsOf<N>): Promise<void> {
    // 1) 브레드크럼엔 항상 기록 (메모리 only, 법적 수집 아님)
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      kind: "event",
      name,
      properties: properties as Record<string, AnalyticsValue> | undefined,
    });

    // 2) 외부 전송은 동의 게이트 뒤 (개발 빌드는 우회)
    if (!__DEV__) {
      const consent = await this.consent.load();
      if (!consent.analytics) return;
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      properties: scrubAnalyticsProperties(name, properties),
      observability: this.enricher.build(),
    };

    try {
      await this.sink.track(event);
    } catch { /* 무시 */ }
  }
}
```

### 4.4 Module Initialization

```ts
// src/core/observability/index.ts
let errorReporter: ErrorReporter | undefined;
let analytics: Analytics | undefined;

export type ObservabilityConfig = {
  errorSink: ErrorSink;
  analyticsSink: AnalyticsSink;
  localeService: LocaleService;
};

export async function initializeObservability(config: ObservabilityConfig): Promise<void> {
  const installId = await getOrCreateInstallId();
  const consent = new ConsentStore();
  const breadcrumbs = new BreadcrumbBuffer();
  const enricher = new ContextEnricher(
    installId,
    Application.nativeApplicationVersion ?? "unknown",
    Platform.OS as "android" | "ios" | "web",
    String(Platform.Version),
    () => config.localeService.getCurrent(),
    randomUUID(),
  );
  errorReporter = new ErrorReporter(config.errorSink, enricher, breadcrumbs, consent);
  analytics = new Analytics(config.analyticsSink, enricher, breadcrumbs, consent);
}

export function getErrorReporter(): ErrorReporter {
  if (!errorReporter) throw new Error("Observability not initialized");
  return errorReporter;
}

export function getAnalytics(): Analytics {
  if (!analytics) throw new Error("Observability not initialized");
  return analytics;
}

export function resetObservabilityForTests(): void {
  errorReporter = undefined;
  analytics = undefined;
}
```

`AppBootstrapGate`에서 DB 초기화 직후, 화면 렌더 전에 호출.

### 4.5 설계 결정 요약

- **이벤트 레지스트리 = 타입 + 화이트리스트 통합**: 미등록 이벤트/속성은 TS 컴파일 에러. PII 유출이 컴파일 타임에 차단됨.
- **브레드크럼은 동의와 무관하게 기록**: 메모리에만 머물러 법적 수집 아님. 동의 여부는 "에러 발생 시 외부로 올라가는가"만 결정.
- **`__DEV__` 분기로 동의 게이트 우회**: 개발자가 매번 DB 플래그 세팅하는 마찰 제거. 외부 수집은 개발 빌드에 없으므로 프라이버시 위험 없음.

---

## 5. Existing Code Integration

### 5.1 handleError 갱신

```ts
// src/core/errors/handleError.ts
export function createErrorHandler(
  toast: ToastSink,
  errorReporter: Pick<ErrorReporter, "report">,
) {
  return function handleError(error: unknown): void {
    const appError = normalizeError(error);
    void errorReporter.report(appError);
    toast.show(appError.userMessage);
  };
}
```

- `errorReporter`를 인터페이스 형태(`Pick<>`)로 주입 → 기존 프로젝트의 수동 목 테스트 스타일 유지.
- `logger.error()` 호출 제거 — 리포터 내부로 흡수.

### 5.2 logger 축소

```ts
// src/core/errors/logger.ts
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (__DEV__) console.debug(formatEntry(createEntry("DEBUG", message, context)));
  },
  info(message: string, context?: Record<string, unknown>): void {
    if (__DEV__) console.info(formatEntry(createEntry("INFO", message, context)));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    if (__DEV__) console.warn(formatEntry(createEntry("WARN", message, context)));
  },
  // error() 제거 — ErrorReporter로 대체
};
```

- 프로덕션에선 무출력.
- `__tests__/errors/logger.test.ts`에서 `error()` 관련 테스트 제거, 나머지 유지.

### 5.3 전역 에러 캡처

```ts
// src/core/observability/globalHandler.ts
import tracking from "promise/setimmediate/rejection-tracking";

export function installGlobalErrorHandler(reporter: ErrorReporter): void {
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    void reporter.report(normalizeError(error));
    prev(error, isFatal);
  });

  tracking.enable({
    allRejections: true,
    onUnhandled: (_id, error) => { void reporter.report(normalizeError(error)); },
    onHandled: () => {},
  });
}
```

React ErrorBoundary:

```tsx
// src/app/ObservabilityErrorBoundary.tsx
export class ObservabilityErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error): void {
    void getErrorReporter().report(normalizeError(error));
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

`AppProviders` 트리 최상위 근처에 배치. fallback은 최소 구성("오류가 발생했습니다 + 재시작 버튼"). 정교한 복구 UX는 후속 작업.

### 5.4 TanStack Query 통합

기존 mutation 글로벌 핸들러에서 `handleError` 호출하는 경로 유지. `handleError` 내부가 `errorReporter.report`로 교체됐으므로 자동 반영. Query 에러는 기존 방침대로 화면별 인라인 처리.

### 5.5 시드 분석 이벤트 호출부

레지스트리 등록 + 실제 `track()` 호출 연결:

| 이벤트 | 호출 위치 |
|---|---|
| `app_opened` | `AppBootstrapGate` 초기화 완료 시 1회 |
| `deck_created` | `DeckService.create()` 성공 후 |
| `deck_deleted` | `DeckService.delete()` 성공 후 |
| `study_session_started` | `StudySessionService.start()` 시 |
| `study_session_completed` | `StudySessionService`에서 세션 종료 시 |

---

## 6. Testing Strategy

### 6.1 피라미드

| 레이어 | 대상 | 전략 |
|---|---|---|
| 유닛 | `BreadcrumbBuffer`, `scrubErrorContext`, `scrubAnalyticsProperties`, `ConsentStore`, `ContextEnricher`, `InstallId` | 순수 로직 / 소규모 SQLite |
| 유닛 | `ErrorReporter`, `Analytics` | 수동 목(sink/enricher/consent) 주입 |
| 통합 | `createErrorHandler` → `ErrorReporter` → `FakeErrorSink` | 기존 `__tests__/errors/handleError.test.ts` 확장 |
| 스모크 | 전역 핸들러 · `ErrorBoundary` | 수동 체크리스트 |

### 6.2 파일 구조

```
__tests__/observability/
├── breadcrumbBuffer.test.ts
├── scrub.test.ts
├── consent.test.ts
├── installId.test.ts
├── contextEnricher.test.ts
├── errorReporter.test.ts
├── analytics.test.ts
└── helpers/
    ├── FakeErrorSink.ts
    ├── FakeAnalyticsSink.ts
    └── observabilityFactories.ts
```

### 6.3 핵심 케이스

**스크러빙**
- 허용 키만 통과, 미등록 키 탈락.
- 문자열 200자 제한.
- 중첩 객체·배열 → `[redacted]`.

**동의**
- 기본값 `{ errorReports: false, analytics: false }`.
- 채널 독립적으로 토글.
- `hasDecided()`는 `consent_decided_at` 존재 여부로 판단.
- `ErrorReporter.report()` — 프로덕션 빌드 시뮬레이션에서 동의 없으면 sink 미호출.
- `Analytics.track()` — 동의 없어도 브레드크럼 버퍼엔 기록, sink는 미호출.

**`__DEV__` 토글 전략** — Jest에서 `__DEV__`는 보통 `true`. 동의 게이트 테스트는 매 테스트 파일 상단에서 `(global as any).__DEV__ = false`로 고정한 뒤 `beforeEach/afterEach`로 관리. 개발 빌드 우회 동작 자체는 "개발 빌드에선 무조건 sink 호출됨" 케이스로 `__DEV__=true` 세팅에서 별도 검증.

**브레드크럼**
- capacity 초과 시 오래된 항목 제거.
- `ErrorReport.breadcrumbs`는 스냅샷(복사), 원본 버퍼는 유지.

**ErrorReporter**
- `AppError.context` → `scrubErrorContext`를 통과한 형태로 `ErrorReport.context`에 도달.
- `cause` 체인이 `{ name, message }`로 직렬화.
- sink 내부 예외가 호출자에게 전파 안 됨.

**Analytics**
- 레지스트리 외 이름·속성 사용 시 TS 컴파일 실패 — 수동 검증 샘플(`// @ts-expect-error` 주석) 파일로 확인.
- 런타임에도 미등록 속성은 스크러빙에서 제거(이중 방어선).

**handleError 통합**
- i18n 초기화 헬퍼 + `FakeErrorSink`.
- 에러 발생 시 `toast.show(userMessage)`와 `errorReporter.report()`가 모두 호출됨.

### 6.4 목 규칙

프로젝트 관행(`CLAUDE.md`) 준수:
- `jest.mock()` 미사용.
- 인터페이스 기반 수동 목만.
- `FakeErrorSink` / `FakeAnalyticsSink`는 received 배열만 보관:

```ts
class FakeErrorSink implements ErrorSink {
  readonly received: ErrorReport[] = [];
  async report(r: ErrorReport): Promise<void> { this.received.push(r); }
}
```

- 팩토리는 `__tests__/observability/helpers/observabilityFactories.ts`에 분리 (기존 `factories.ts` 비대화 방지).

### 6.5 스모크 체크리스트

`docs/qa/observability-smoke.md` 신규 작성. 구현 후 수동 확인:

- `__DEV__` 개발 빌드에서 의도적 throw → 콘솔에 구조화 로그 출력.
- 미처리 Promise rejection 시 리포터 수신.
- `ErrorBoundary` 자식 throw 시 fallback 렌더 + 리포트 수신.
- 앱 재실행 시 `install_id` 유지, `sessionId` 재발급.
- 시드 이벤트 5개 호출 시 브레드크럼 기록 + (프로덕션 동의 on일 때) sink 수신.

이 문서는 벤더 붙일 때 회귀 테스트로 재활용.

---

## 7. Acceptance Criteria

- `src/core/observability/` 파일 구조 구현 완료.
- `handleError` → `ErrorReporter` 경로 동작, 기존 토스트 UX 변함 없음.
- 전역 에러 캡처 3경로(RN 핸들러, Promise rejection, ErrorBoundary)에서 에러가 리포터까지 도달 (수동 QA 체크).
- 스크러빙 화이트리스트가 모든 미등록 키를 제거함 (유닛 테스트).
- 동의 기본값 `false`에서 sink 미호출, `true`에서 호출됨 (유닛 테스트, `__DEV__=false` 시뮬레이션).
- `Analytics.track()`이 레지스트리 외 이름·속성을 쓰면 TS 컴파일 실패 (수동 검증 샘플 파일).
- 시드 이벤트 5개 실제 호출부 연결 완료.
- `npm run typecheck` / `npm run lint` / `npm test` 전부 통과.

---

## 8. Follow-up Work

이 스펙이 기반을 놓고, 아래 작업들이 뒤따른다:

1. **동의 UI** — 첫 실행 프롬프트 + 설정 화면 토글. 벤더 선정과 동시 진행.
2. **원격 싱크 구현** — 벤더 확정 후 `RemoteErrorSink` / `RemoteAnalyticsSink` 추가. 변경은 `initializeObservability()` 인자 교체 1곳.
3. **Play Data Safety 선언** — 실제 수집 항목 문서화 및 Play Console 제출.
4. **국외 이전 동의 문구** — 벤더 리전이 해외일 경우 동의 텍스트 업데이트.
5. **오프라인 버퍼 / 재시도** — `RemoteSink` 구현에 부속.
6. **분석 이벤트 카탈로그 확장** — 기능 추가 시 레지스트리에 하나씩 등록.
