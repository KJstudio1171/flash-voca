# Observability Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에러 리포팅과 제품 분석 이벤트를 위한 관측성 인프라 구축. 인터페이스·프라이버시 기반만 수립하고 벤더 연동·동의 UI·원격 전송은 후속 작업으로 분리.

**Architecture:** `src/core/observability/`에 모듈 싱글톤으로 초기화되는 `ErrorReporter` · `Analytics` 두 채널. `ContextEnricher` · `scrub` · `ConsentStore` · `BreadcrumbBuffer`를 공유 프리미티브로 조립. 전역 에러 캡처 3경로(RN 핸들러 · Promise rejection · ErrorBoundary)를 `ErrorReporter`로 수렴. 프로덕션 동의 기본값 `false`, 개발 빌드(`__DEV__`)는 동의 게이트 우회.

**Tech Stack:** TypeScript, React Native, Expo 54, expo-sqlite, expo-crypto, expo-application, Jest, React.

**Spec:** `docs/superpowers/specs/2026-04-13-observability-design.md`

---

## Task Ordering

1. Core types (토대)
2. Event registry (Analytics가 의존)
3. **KeyValueStore 추상화** (app_meta 접근을 테스트 가능하게)
4. InstallId (KeyValueStore 주입)
5. ConsentStore (KeyValueStore 주입)
6. BreadcrumbBuffer (순수 메모리)
7. Scrubbing 유틸
8. ContextEnricher
9. Console sinks + NoopSink
10. ErrorReporter
11. Analytics
12. Module initialization (`index.ts`)
13. `logger` 축소
14. `handleError` 갱신
15. Global handler
16. ObservabilityErrorBoundary
17. Bootstrap 와이어업
18. 시드 분석 이벤트 호출부 5개
19. QA 스모크 체크리스트 문서
20. 최종 검증

**테스트 환경 주의**: 이 프로젝트는 `jest-expo` 프리셋을 쓰며 expo-sqlite가 풀 모킹되지 않음. DB 접근은 `KeyValueStore` 인터페이스로 격리하고, 테스트는 `InMemoryKeyValueStore`를 주입한다 (기존 프로젝트의 인터페이스 기반 수동 목 규칙과 일관).

---

### Task 0: 사전 의존성 설치

**Files:**
- Modify: `package.json`

현재 `package.json`에는 `expo-application`, `expo-crypto`, `promise`가 포함되어 있지 않다. 후속 태스크들이 참조하므로 먼저 설치한다.

- [ ] **Step 1: Expo SDK 호환 버전 설치**

Run:
```bash
npx expo install expo-application expo-crypto
```

Expected: `package.json`의 `dependencies`에 두 패키지가 Expo 54 호환 버전으로 추가된다.

- [ ] **Step 2: `promise` 패키지 설치 (글로벌 rejection tracking용)**

Run:
```bash
npm install promise
```

Expected: `package.json`의 `dependencies`에 `promise`가 추가된다. (React Native가 내부에서 사용하는 `promise/setimmediate/rejection-tracking` 서브패스에 접근하기 위함.)

- [ ] **Step 3: typecheck 베이스라인 확인**

Run: `npm run typecheck`
Expected: PASS (패키지 추가만으로 타입 오류 없음)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(observability): add expo-application, expo-crypto, promise deps"
```

---

### Task 1: Core Types

**Files:**
- Create: `src/core/observability/types.ts`
- Test: 없음 (타입만)

- [ ] **Step 1: 파일 생성**

```ts
// src/core/observability/types.ts
import type { AnalyticsEventName } from "@/src/core/observability/eventRegistry";

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
  name: AnalyticsEventName;
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

- [ ] **Step 2: typecheck (의존성 때문에 Task 2까지 실패, OK)**

Run: `npx tsc --noEmit`
Expected: `eventRegistry` 미존재로 에러. Task 2에서 해결.

- [ ] **Step 3: 커밋 안 함** (Task 2와 함께 커밋)

---

### Task 2: Event Registry

**Files:**
- Create: `src/core/observability/eventRegistry.ts`
- Test: 없음 (타입 레벨)

- [ ] **Step 1: 파일 생성**

```ts
// src/core/observability/eventRegistry.ts
import type { AnalyticsValue } from "@/src/core/observability/types";

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

export type AnalyticsEventProperties<N extends AnalyticsEventName> = Partial<
  Record<(typeof analyticsEventRegistry)[N]["allowedProps"][number], AnalyticsValue>
>;
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 통과 (types.ts + eventRegistry.ts 상호 참조 해결).

- [ ] **Step 3: 커밋**

```bash
git add src/core/observability/types.ts src/core/observability/eventRegistry.ts
git commit -m "feat(observability): add core types and analytics event registry"
```

---

### Task 3: KeyValueStore Abstraction

**Files:**
- Create: `src/core/observability/storage.ts`
- Create: `__tests__/observability/helpers/InMemoryKeyValueStore.ts`

- [ ] **Step 1: 인터페이스 + 실제 구현 작성**

```ts
// src/core/observability/storage.ts
import { getDatabaseAsync } from "@/src/core/database/client";

export interface KeyValueStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  getMany(keys: readonly string[]): Promise<Map<string, string>>;
}

export class SqliteKeyValueStore implements KeyValueStore {
  async get(key: string): Promise<string | undefined> {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = ?`,
      key,
    );
    return row?.value;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      key,
      value,
    );
  }

  async getMany(keys: readonly string[]): Promise<Map<string, string>> {
    if (keys.length === 0) return new Map();
    const db = await getDatabaseAsync();
    const placeholders = keys.map(() => "?").join(", ");
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM app_meta WHERE key IN (${placeholders})`,
      ...keys,
    );
    return new Map(rows.map((r) => [r.key, r.value]));
  }
}
```

- [ ] **Step 2: 테스트용 인메모리 구현 작성**

```ts
// __tests__/observability/helpers/InMemoryKeyValueStore.ts
import type { KeyValueStore } from "@/src/core/observability/storage";

export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.data.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async getMany(keys: readonly string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const k of keys) {
      const v = this.data.get(k);
      if (v !== undefined) out.set(k, v);
    }
    return out;
  }

  clear(): void {
    this.data.clear();
  }
}
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/core/observability/storage.ts __tests__/observability/helpers/InMemoryKeyValueStore.ts
git commit -m "feat(observability): add KeyValueStore abstraction for testable persistence"
```

---

### Task 4: InstallId

**Files:**
- Create: `src/core/observability/installId.ts`
- Create: `__tests__/observability/installId.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// __tests__/observability/installId.test.ts
import { getOrCreateInstallId } from "@/src/core/observability/installId";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";

describe("getOrCreateInstallId", () => {
  it("creates and persists a UUID on first call", async () => {
    const store = new InMemoryKeyValueStore();
    const id = await getOrCreateInstallId(store);
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await store.get("install_id")).toBe(id);
  });

  it("returns the same id on subsequent calls", async () => {
    const store = new InMemoryKeyValueStore();
    const first = await getOrCreateInstallId(store);
    const second = await getOrCreateInstallId(store);
    expect(second).toBe(first);
  });

  it("returns pre-existing id when store already has one", async () => {
    const store = new InMemoryKeyValueStore();
    await store.set("install_id", "preset-uuid");
    expect(await getOrCreateInstallId(store)).toBe("preset-uuid");
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/installId.test.ts`
Expected: 모듈 미존재 에러.

- [ ] **Step 3: 구현**

```ts
// src/core/observability/installId.ts
import { randomUUID } from "expo-crypto";

import type { KeyValueStore } from "@/src/core/observability/storage";

const KEY = "install_id";

export async function getOrCreateInstallId(store: KeyValueStore): Promise<string> {
  const existing = await store.get(KEY);
  if (existing) return existing;
  const id = randomUUID();
  await store.set(KEY, id);
  return id;
}
```

- [ ] **Step 4: 테스트 실행**

Run: `npx jest __tests__/observability/installId.test.ts`
Expected: 3/3 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/observability/installId.ts __tests__/observability/installId.test.ts
git commit -m "feat(observability): add install id with injectable key-value store"
```

---

### Task 5: ConsentStore

**Files:**
- Create: `src/core/observability/consent.ts`
- Create: `__tests__/observability/consent.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// __tests__/observability/consent.test.ts
import { ConsentStore } from "@/src/core/observability/consent";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";

describe("ConsentStore", () => {
  it("defaults both channels to false", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    expect(await store.load()).toEqual({ errorReports: false, analytics: false });
  });

  it("setErrorReports persists and load reflects", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    await store.setErrorReports(true);
    expect(await store.load()).toEqual({ errorReports: true, analytics: false });
  });

  it("channels are independent", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    await store.setAnalytics(true);
    expect(await store.load()).toEqual({ errorReports: false, analytics: true });
  });

  it("hasDecided is false until markDecided is called", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    expect(await store.hasDecided()).toBe(false);
    await store.markDecided();
    expect(await store.hasDecided()).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/consent.test.ts`
Expected: 모듈 미존재.

- [ ] **Step 3: 구현**

```ts
// src/core/observability/consent.ts
import type { KeyValueStore } from "@/src/core/observability/storage";

export type ConsentChannels = {
  errorReports: boolean;
  analytics: boolean;
};

const KEY_ERROR = "consent_error_reports";
const KEY_ANALYTICS = "consent_analytics";
const KEY_DECIDED = "consent_decided_at";

export class ConsentStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<ConsentChannels> {
    const values = await this.store.getMany([KEY_ERROR, KEY_ANALYTICS]);
    return {
      errorReports: values.get(KEY_ERROR) === "true",
      analytics: values.get(KEY_ANALYTICS) === "true",
    };
  }

  async setErrorReports(enabled: boolean): Promise<void> {
    await this.store.set(KEY_ERROR, enabled ? "true" : "false");
  }

  async setAnalytics(enabled: boolean): Promise<void> {
    await this.store.set(KEY_ANALYTICS, enabled ? "true" : "false");
  }

  async hasDecided(): Promise<boolean> {
    return Boolean(await this.store.get(KEY_DECIDED));
  }

  async markDecided(): Promise<void> {
    await this.store.set(KEY_DECIDED, new Date().toISOString());
  }
}
```

- [ ] **Step 4: 테스트 실행**

Run: `npx jest __tests__/observability/consent.test.ts`
Expected: 4/4 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/observability/consent.ts __tests__/observability/consent.test.ts
git commit -m "feat(observability): add consent store with injectable persistence"
```

---

### Task 6: BreadcrumbBuffer

**Files:**
- Create: `src/core/observability/breadcrumbBuffer.ts`
- Create: `__tests__/observability/breadcrumbBuffer.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// __tests__/observability/breadcrumbBuffer.test.ts
import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import type { Breadcrumb } from "@/src/core/observability/types";

function makeCrumb(name: string): Breadcrumb {
  return { timestamp: new Date().toISOString(), kind: "event", name };
}

describe("BreadcrumbBuffer", () => {
  it("snapshot returns pushed items in order", () => {
    const buf = new BreadcrumbBuffer(10);
    buf.push(makeCrumb("a"));
    buf.push(makeCrumb("b"));
    expect(buf.snapshot().map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("evicts oldest when exceeding capacity", () => {
    const buf = new BreadcrumbBuffer(2);
    buf.push(makeCrumb("a"));
    buf.push(makeCrumb("b"));
    buf.push(makeCrumb("c"));
    expect(buf.snapshot().map((c) => c.name)).toEqual(["b", "c"]);
  });

  it("snapshot is a copy — mutating it does not affect buffer", () => {
    const buf = new BreadcrumbBuffer(5);
    buf.push(makeCrumb("a"));
    const snap = buf.snapshot();
    snap.pop();
    expect(buf.snapshot().map((c) => c.name)).toEqual(["a"]);
  });

  it("clear empties the buffer", () => {
    const buf = new BreadcrumbBuffer(5);
    buf.push(makeCrumb("a"));
    buf.clear();
    expect(buf.snapshot()).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/breadcrumbBuffer.test.ts`
Expected: 파일 미존재 에러.

- [ ] **Step 3: 구현**

```ts
// src/core/observability/breadcrumbBuffer.ts
import type { Breadcrumb } from "@/src/core/observability/types";

export class BreadcrumbBuffer {
  private readonly items: Breadcrumb[] = [];

  constructor(private readonly capacity: number = 50) {}

  push(crumb: Breadcrumb): void {
    this.items.push(crumb);
    if (this.items.length > this.capacity) this.items.shift();
  }

  snapshot(): Breadcrumb[] {
    return [...this.items];
  }

  clear(): void {
    this.items.length = 0;
  }
}
```

- [ ] **Step 4: 테스트 실행**

Run: `npx jest __tests__/observability/breadcrumbBuffer.test.ts`
Expected: 4/4 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/observability/breadcrumbBuffer.ts __tests__/observability/breadcrumbBuffer.test.ts
git commit -m "feat(observability): add in-memory breadcrumb ring buffer"
```

---

### Task 7: Scrubbing Utilities

**Files:**
- Create: `src/core/observability/scrub.ts`
- Create: `__tests__/observability/scrub.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// __tests__/observability/scrub.test.ts
import {
  scrubErrorContext,
  scrubAnalyticsProperties,
} from "@/src/core/observability/scrub";

describe("scrubErrorContext", () => {
  it("keeps allowed keys", () => {
    const result = scrubErrorContext({ deckId: "d1", httpStatus: 500 });
    expect(result).toEqual({ deckId: "d1", httpStatus: 500 });
  });

  it("drops disallowed keys (e.g. deckName)", () => {
    const result = scrubErrorContext({ deckId: "d1", deckName: "secret" });
    expect(result).toEqual({ deckId: "d1" });
  });

  it("truncates long strings to 200 chars", () => {
    const long = "a".repeat(500);
    const result = scrubErrorContext({ deckId: long });
    expect((result?.deckId as string).length).toBe(200);
  });

  it("replaces nested objects with [redacted]", () => {
    const result = scrubErrorContext({ deckId: { nested: true } });
    expect(result).toEqual({ deckId: "[redacted]" });
  });

  it("returns undefined for empty input", () => {
    expect(scrubErrorContext(undefined)).toBeUndefined();
    expect(scrubErrorContext({})).toBeUndefined();
    expect(scrubErrorContext({ deckName: "x" })).toBeUndefined();
  });
});

describe("scrubAnalyticsProperties", () => {
  it("keeps allowed props for registered event", () => {
    const result = scrubAnalyticsProperties("deck_created", {
      cardCount: 10,
      isCustom: true,
    });
    expect(result).toEqual({ cardCount: 10, isCustom: true });
  });

  it("drops unregistered props", () => {
    const result = scrubAnalyticsProperties("deck_created", {
      cardCount: 10,
      deckName: "secret",
    });
    expect(result).toEqual({ cardCount: 10 });
  });

  it("returns undefined when nothing survives", () => {
    expect(
      scrubAnalyticsProperties("deck_created", { deckName: "secret" }),
    ).toBeUndefined();
  });

  it("coerces nested objects to [redacted]", () => {
    const result = scrubAnalyticsProperties("deck_created", {
      cardCount: { nested: 1 } as unknown as number,
    });
    expect(result).toEqual({ cardCount: "[redacted]" });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/scrub.test.ts`
Expected: 모듈 미존재.

- [ ] **Step 3: 구현**

```ts
// src/core/observability/scrub.ts
import {
  analyticsEventRegistry,
  type AnalyticsEventName,
} from "@/src/core/observability/eventRegistry";
import type { AnalyticsValue } from "@/src/core/observability/types";

const ALLOWED_ERROR_CONTEXT_KEYS = new Set<string>([
  "deckId",
  "cardId",
  "bundleId",
  "userId",
  "sessionId",
  "operation",
  "repository",
  "method",
  "httpStatus",
  "code",
  "url",
  "retryCount",
  "elapsedMs",
  "attemptCount",
]);

const STRING_MAX_LEN = 200;

function sanitizeValue(v: unknown): unknown {
  if (v === null || typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v === "string") {
    return v.length > STRING_MAX_LEN ? v.slice(0, STRING_MAX_LEN) : v;
  }
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
  const allowed = new Set<string>(
    analyticsEventRegistry[eventName].allowedProps as readonly string[],
  );
  const out: Record<string, AnalyticsValue> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k)) continue;
    const sanitized = sanitizeValue(v);
    if (
      sanitized === null ||
      typeof sanitized === "string" ||
      typeof sanitized === "number" ||
      typeof sanitized === "boolean"
    ) {
      out[k] = sanitized;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
```

- [ ] **Step 4: 테스트 실행**

Run: `npx jest __tests__/observability/scrub.test.ts`
Expected: 9/9 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/observability/scrub.ts __tests__/observability/scrub.test.ts
git commit -m "feat(observability): add whitelist scrubbing for errors and analytics"
```

---

### Task 8: ContextEnricher

**Files:**
- Create: `src/core/observability/contextEnricher.ts`
- Create: `__tests__/observability/contextEnricher.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// __tests__/observability/contextEnricher.test.ts
import { ContextEnricher } from "@/src/core/observability/contextEnricher";

describe("ContextEnricher", () => {
  it("build() returns composed context with getLocale evaluated lazily", () => {
    let locale = "ko";
    const enricher = new ContextEnricher(
      "install-123",
      "1.0.0",
      "android",
      "14",
      () => locale,
      "session-abc",
    );

    const ctx1 = enricher.build();
    expect(ctx1).toEqual({
      installId: "install-123",
      appVersion: "1.0.0",
      platform: "android",
      osVersion: "14",
      locale: "ko",
      sessionId: "session-abc",
      userId: undefined,
    });

    locale = "en";
    const ctx2 = enricher.build();
    expect(ctx2.locale).toBe("en");
  });

  it("build(userId) attaches userId", () => {
    const enricher = new ContextEnricher(
      "i",
      "v",
      "ios",
      "17",
      () => "ja",
      "s",
    );
    expect(enricher.build("user-1").userId).toBe("user-1");
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/contextEnricher.test.ts`
Expected: 모듈 미존재.

- [ ] **Step 3: 구현**

```ts
// src/core/observability/contextEnricher.ts
import type { ObservabilityContext } from "@/src/core/observability/types";

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

- [ ] **Step 4: 테스트 실행**

Run: `npx jest __tests__/observability/contextEnricher.test.ts`
Expected: 2/2 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/observability/contextEnricher.ts __tests__/observability/contextEnricher.test.ts
git commit -m "feat(observability): add context enricher"
```

---

### Task 9: Console Sinks + Noop Sink

**Files:**
- Create: `src/core/observability/sinks/ConsoleErrorSink.ts`
- Create: `src/core/observability/sinks/ConsoleAnalyticsSink.ts`
- Create: `src/core/observability/sinks/NoopSink.ts`

- [ ] **Step 1: 파일 생성 (간단한 어댑터, 테스트 생략)**

```ts
// src/core/observability/sinks/ConsoleErrorSink.ts
import type { ErrorReport, ErrorSink } from "@/src/core/observability/types";

export class ConsoleErrorSink implements ErrorSink {
  async report(report: ErrorReport): Promise<void> {
    console.error(JSON.stringify(report, null, 2));
  }
}
```

```ts
// src/core/observability/sinks/ConsoleAnalyticsSink.ts
import type { AnalyticsEvent, AnalyticsSink } from "@/src/core/observability/types";

export class ConsoleAnalyticsSink implements AnalyticsSink {
  async track(event: AnalyticsEvent): Promise<void> {
    console.info(JSON.stringify(event, null, 2));
  }
}
```

```ts
// src/core/observability/sinks/NoopSink.ts
import type {
  AnalyticsEvent,
  AnalyticsSink,
  ErrorReport,
  ErrorSink,
} from "@/src/core/observability/types";

export class NoopErrorSink implements ErrorSink {
  async report(_report: ErrorReport): Promise<void> {
    // no-op
  }
}

export class NoopAnalyticsSink implements AnalyticsSink {
  async track(_event: AnalyticsEvent): Promise<void> {
    // no-op
  }
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/core/observability/sinks/
git commit -m "feat(observability): add console and noop sinks"
```

---

### Task 10: ErrorReporter

**Files:**
- Create: `src/core/observability/errorReporter.ts`
- Create: `__tests__/observability/errorReporter.test.ts`
- Create: `__tests__/observability/helpers/FakeErrorSink.ts`
- Create: `__tests__/observability/helpers/observabilityFactories.ts`

- [ ] **Step 1: 헬퍼 작성**

```ts
// __tests__/observability/helpers/FakeErrorSink.ts
import type { ErrorReport, ErrorSink } from "@/src/core/observability/types";

export class FakeErrorSink implements ErrorSink {
  readonly received: ErrorReport[] = [];
  async report(report: ErrorReport): Promise<void> {
    this.received.push(report);
  }
}

export class ThrowingErrorSink implements ErrorSink {
  async report(): Promise<void> {
    throw new Error("sink failed");
  }
}
```

```ts
// __tests__/observability/helpers/observabilityFactories.ts
import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import { ContextEnricher } from "@/src/core/observability/contextEnricher";
import type { ObservabilityContext } from "@/src/core/observability/types";

export function makeEnricher(
  overrides: Partial<{
    installId: string;
    appVersion: string;
    platform: "android" | "ios" | "web";
    osVersion: string;
    locale: string;
    sessionId: string;
  }> = {},
): ContextEnricher {
  const defaults = {
    installId: "install-test",
    appVersion: "0.0.0",
    platform: "android" as const,
    osVersion: "14",
    locale: "ko",
    sessionId: "session-test",
  };
  const merged = { ...defaults, ...overrides };
  return new ContextEnricher(
    merged.installId,
    merged.appVersion,
    merged.platform,
    merged.osVersion,
    () => merged.locale,
    merged.sessionId,
  );
}

export function makeBreadcrumbBuffer(capacity = 50): BreadcrumbBuffer {
  return new BreadcrumbBuffer(capacity);
}

export function makeObservabilityContext(
  overrides: Partial<ObservabilityContext> = {},
): ObservabilityContext {
  return {
    installId: "install-test",
    appVersion: "0.0.0",
    platform: "android",
    osVersion: "14",
    locale: "ko",
    sessionId: "session-test",
    userId: undefined,
    ...overrides,
  };
}
```

- [ ] **Step 2: 실패 테스트 작성**

```ts
// __tests__/observability/errorReporter.test.ts
import { DeckSaveError } from "@/src/core/errors";
import { ErrorReporter } from "@/src/core/observability/errorReporter";
import { ConsentStore } from "@/src/core/observability/consent";
import { setupI18nForTest } from "@/__tests__/helpers/i18nTestSetup";
import {
  FakeErrorSink,
  ThrowingErrorSink,
} from "@/__tests__/observability/helpers/FakeErrorSink";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";
import {
  makeBreadcrumbBuffer,
  makeEnricher,
} from "@/__tests__/observability/helpers/observabilityFactories";

beforeAll(async () => {
  await setupI18nForTest("ko");
});

function setDev(value: boolean): void {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

function makeConsent(): ConsentStore {
  return new ConsentStore(new InMemoryKeyValueStore());
}

describe("ErrorReporter (production gate)", () => {
  beforeEach(() => {
    setDev(false);
  });

  afterEach(() => {
    setDev(true);
  });

  it("does not call sink when consent is false", async () => {
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(
      sink,
      makeEnricher(),
      makeBreadcrumbBuffer(),
      makeConsent(),
    );
    await reporter.report(new DeckSaveError({ context: { deckId: "d1" } }));
    expect(sink.received).toHaveLength(0);
  });

  it("calls sink when errorReports consent is true", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), makeBreadcrumbBuffer(), consent);

    await reporter.report(new DeckSaveError({ context: { deckId: "d1" } }));
    expect(sink.received).toHaveLength(1);
    expect(sink.received[0].context).toEqual({ deckId: "d1" });
  });

  it("scrubs disallowed context keys", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), makeBreadcrumbBuffer(), consent);

    await reporter.report(
      new DeckSaveError({ context: { deckId: "d1", deckName: "secret" } }),
    );
    expect(sink.received[0].context).toEqual({ deckId: "d1" });
  });

  it("attaches breadcrumb snapshot", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const buffer = makeBreadcrumbBuffer();
    buffer.push({
      timestamp: new Date().toISOString(),
      kind: "event",
      name: "deck_created",
    });
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), buffer, consent);

    await reporter.report(new DeckSaveError());
    expect(sink.received[0].breadcrumbs).toHaveLength(1);
    expect(sink.received[0].breadcrumbs[0].name).toBe("deck_created");
  });

  it("suppresses sink exceptions", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const reporter = new ErrorReporter(
      new ThrowingErrorSink(),
      makeEnricher(),
      makeBreadcrumbBuffer(),
      consent,
    );

    await expect(reporter.report(new DeckSaveError())).resolves.toBeUndefined();
  });

  it("serializes cause to { name, message }", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), makeBreadcrumbBuffer(), consent);

    const cause = new Error("underlying");
    await reporter.report(new DeckSaveError({ cause }));
    expect(sink.received[0].cause).toEqual({ name: "Error", message: "underlying" });
  });
});

describe("ErrorReporter (__DEV__ bypass)", () => {
  beforeEach(() => {
    setDev(true);
  });

  it("calls sink even when consent is false", async () => {
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(
      sink,
      makeEnricher(),
      makeBreadcrumbBuffer(),
      makeConsent(),
    );
    await reporter.report(new DeckSaveError());
    expect(sink.received).toHaveLength(1);
  });
});
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/errorReporter.test.ts`
Expected: 모듈 미존재.

- [ ] **Step 4: 구현**

```ts
// src/core/observability/errorReporter.ts
import type { AppError } from "@/src/core/errors";
import type { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import type { ConsentStore } from "@/src/core/observability/consent";
import type { ContextEnricher } from "@/src/core/observability/contextEnricher";
import { scrubErrorContext } from "@/src/core/observability/scrub";
import type { ErrorReport, ErrorSink } from "@/src/core/observability/types";

export class ErrorReporter {
  constructor(
    private readonly sink: ErrorSink,
    private readonly enricher: ContextEnricher,
    private readonly breadcrumbs: BreadcrumbBuffer,
    private readonly consent: ConsentStore,
  ) {}

  async report(appError: AppError, userId?: string): Promise<void> {
    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
    if (!isDev) {
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
      // swallow — recursive reporting would loop
    }
  }
}

function extractCauseInfo(
  cause: unknown,
): { name: string; message: string } | undefined {
  if (cause instanceof Error) return { name: cause.name, message: cause.message };
  return undefined;
}
```

- [ ] **Step 5: 테스트 실행**

Run: `npx jest __tests__/observability/errorReporter.test.ts`
Expected: 7/7 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/core/observability/errorReporter.ts __tests__/observability/
git commit -m "feat(observability): add ErrorReporter with consent gate and breadcrumb attach"
```

---

### Task 11: Analytics

**Files:**
- Create: `src/core/observability/analytics.ts`
- Create: `__tests__/observability/analytics.test.ts`
- Modify: `__tests__/observability/helpers/FakeErrorSink.ts` → `FakeSinks.ts`로 확장

- [ ] **Step 1: FakeAnalyticsSink 추가**

```ts
// __tests__/observability/helpers/FakeErrorSink.ts (덧붙임)
import type {
  AnalyticsEvent,
  AnalyticsSink,
} from "@/src/core/observability/types";

export class FakeAnalyticsSink implements AnalyticsSink {
  readonly received: AnalyticsEvent[] = [];
  async track(event: AnalyticsEvent): Promise<void> {
    this.received.push(event);
  }
}

export class ThrowingAnalyticsSink implements AnalyticsSink {
  async track(): Promise<void> {
    throw new Error("sink failed");
  }
}
```

- [ ] **Step 2: 실패 테스트 작성**

```ts
// __tests__/observability/analytics.test.ts
import { Analytics } from "@/src/core/observability/analytics";
import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import { ConsentStore } from "@/src/core/observability/consent";
import {
  FakeAnalyticsSink,
  ThrowingAnalyticsSink,
} from "@/__tests__/observability/helpers/FakeErrorSink";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";
import { makeEnricher } from "@/__tests__/observability/helpers/observabilityFactories";

function setDev(value: boolean): void {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

function makeConsent(): ConsentStore {
  return new ConsentStore(new InMemoryKeyValueStore());
}

describe("Analytics (production gate)", () => {
  beforeEach(() => {
    setDev(false);
  });

  afterEach(() => {
    setDev(true);
  });

  it("records breadcrumb even when consent is false", async () => {
    const buffer = new BreadcrumbBuffer();
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(sink, makeEnricher(), buffer, makeConsent());

    await analytics.track("deck_created", { cardCount: 5, isCustom: true });

    expect(buffer.snapshot()).toHaveLength(1);
    expect(buffer.snapshot()[0].name).toBe("deck_created");
    expect(sink.received).toHaveLength(0);
  });

  it("calls sink when analytics consent is true", async () => {
    const consent = makeConsent();
    await consent.setAnalytics(true);
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(sink, makeEnricher(), new BreadcrumbBuffer(), consent);

    await analytics.track("deck_created", { cardCount: 5, isCustom: true });

    expect(sink.received).toHaveLength(1);
    expect(sink.received[0].properties).toEqual({ cardCount: 5, isCustom: true });
  });

  it("scrubs disallowed props at runtime", async () => {
    const consent = makeConsent();
    await consent.setAnalytics(true);
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(sink, makeEnricher(), new BreadcrumbBuffer(), consent);

    await analytics.track("deck_created", {
      cardCount: 5,
      // @ts-expect-error - deckName is not in registry
      deckName: "secret",
    });

    expect(sink.received[0].properties).toEqual({ cardCount: 5 });
  });

  it("suppresses sink exceptions", async () => {
    const consent = makeConsent();
    await consent.setAnalytics(true);
    const analytics = new Analytics(
      new ThrowingAnalyticsSink(),
      makeEnricher(),
      new BreadcrumbBuffer(),
      consent,
    );

    await expect(analytics.track("app_opened")).resolves.toBeUndefined();
  });
});

describe("Analytics (__DEV__ bypass)", () => {
  beforeEach(() => {
    setDev(true);
  });

  it("calls sink even when consent is false", async () => {
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(
      sink,
      makeEnricher(),
      new BreadcrumbBuffer(),
      makeConsent(),
    );
    await analytics.track("app_opened");
    expect(sink.received).toHaveLength(1);
  });
});
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

Run: `npx jest __tests__/observability/analytics.test.ts`
Expected: 모듈 미존재.

- [ ] **Step 4: 구현**

```ts
// src/core/observability/analytics.ts
import type { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import type { ConsentStore } from "@/src/core/observability/consent";
import type { ContextEnricher } from "@/src/core/observability/contextEnricher";
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "@/src/core/observability/eventRegistry";
import { scrubAnalyticsProperties } from "@/src/core/observability/scrub";
import type {
  AnalyticsEvent,
  AnalyticsSink,
  AnalyticsValue,
} from "@/src/core/observability/types";

export class Analytics {
  constructor(
    private readonly sink: AnalyticsSink,
    private readonly enricher: ContextEnricher,
    private readonly breadcrumbs: BreadcrumbBuffer,
    private readonly consent: ConsentStore,
  ) {}

  async track<N extends AnalyticsEventName>(
    name: N,
    properties?: AnalyticsEventProperties<N>,
  ): Promise<void> {
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      kind: "event",
      name,
      properties: properties as Record<string, AnalyticsValue> | undefined,
    });

    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
    if (!isDev) {
      const consent = await this.consent.load();
      if (!consent.analytics) return;
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      properties: scrubAnalyticsProperties(
        name,
        properties as Record<string, unknown> | undefined,
      ),
      observability: this.enricher.build(),
    };

    try {
      await this.sink.track(event);
    } catch {
      // swallow
    }
  }
}
```

- [ ] **Step 5: 테스트 실행**

Run: `npx jest __tests__/observability/analytics.test.ts`
Expected: 5/5 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/core/observability/analytics.ts __tests__/observability/analytics.test.ts __tests__/observability/helpers/FakeErrorSink.ts
git commit -m "feat(observability): add Analytics channel with registry-typed tracking"
```

---

### Task 12: Module Initialization

**Files:**
- Create: `src/core/observability/index.ts`

- [ ] **Step 1: 구현**

```ts
// src/core/observability/index.ts
import * as Application from "expo-application";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";

import { Analytics } from "@/src/core/observability/analytics";
import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import { ConsentStore } from "@/src/core/observability/consent";
import { ContextEnricher } from "@/src/core/observability/contextEnricher";
import { ErrorReporter } from "@/src/core/observability/errorReporter";
import { getOrCreateInstallId } from "@/src/core/observability/installId";
import { SqliteKeyValueStore } from "@/src/core/observability/storage";
import type {
  AnalyticsSink,
  ErrorSink,
} from "@/src/core/observability/types";
import type { LocaleService } from "@/src/shared/i18n";

export type ObservabilityConfig = {
  errorSink: ErrorSink;
  analyticsSink: AnalyticsSink;
  localeService: Pick<LocaleService, "getCurrent">;
};

let errorReporter: ErrorReporter | undefined;
let analytics: Analytics | undefined;

export async function initializeObservability(
  config: ObservabilityConfig,
): Promise<void> {
  const store = new SqliteKeyValueStore();
  const installId = await getOrCreateInstallId(store);
  const consent = new ConsentStore(store);
  const breadcrumbs = new BreadcrumbBuffer();
  const platform = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";
  const enricher = new ContextEnricher(
    installId,
    Application.nativeApplicationVersion ?? "unknown",
    platform,
    String(Platform.Version),
    () => config.localeService.getCurrent(),
    randomUUID(),
  );
  errorReporter = new ErrorReporter(config.errorSink, enricher, breadcrumbs, consent);
  analytics = new Analytics(config.analyticsSink, enricher, breadcrumbs, consent);
}

export function getErrorReporter(): ErrorReporter {
  if (!errorReporter) {
    throw new Error("Observability not initialized. Call initializeObservability first.");
  }
  return errorReporter;
}

export function getAnalytics(): Analytics {
  if (!analytics) {
    throw new Error("Observability not initialized. Call initializeObservability first.");
  }
  return analytics;
}

export function resetObservabilityForTests(): void {
  errorReporter = undefined;
  analytics = undefined;
}

export type { ErrorSink, AnalyticsSink } from "@/src/core/observability/types";
export { ConsoleErrorSink } from "@/src/core/observability/sinks/ConsoleErrorSink";
export { ConsoleAnalyticsSink } from "@/src/core/observability/sinks/ConsoleAnalyticsSink";
export { NoopErrorSink, NoopAnalyticsSink } from "@/src/core/observability/sinks/NoopSink";
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 통과. 만약 `LocaleService.getCurrent`가 없으면 `src/shared/i18n/LocaleService.ts`에서 실제 메서드 이름 확인 후 `Pick<>` 타입과 사용부(`config.localeService.getCurrent()`) 모두 맞춤.

- [ ] **Step 3: 커밋**

```bash
git add src/core/observability/index.ts
git commit -m "feat(observability): add module initialization and singleton accessors"
```

---

### Task 13: Logger 축소

**Files:**
- Modify: `src/core/errors/logger.ts`
- Modify: `__tests__/errors/logger.test.ts`
- Modify: `src/core/errors/index.ts` (logger re-export는 유지)

- [ ] **Step 1: logger.ts 교체**

```ts
// src/core/errors/logger.ts
type LogLevel = "DEBUG" | "INFO" | "WARN";

type LogEntry = {
  level: LogLevel;
  category: "app";
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

function formatEntry(entry: LogEntry): string {
  const output: LogEntry = { ...entry };
  if (output.context === undefined) delete output.context;
  return JSON.stringify(output, null, 2);
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    category: "app",
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

function isDev(): boolean {
  return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (isDev()) console.debug(formatEntry(createEntry("DEBUG", message, context)));
  },
  info(message: string, context?: Record<string, unknown>): void {
    if (isDev()) console.info(formatEntry(createEntry("INFO", message, context)));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    if (isDev()) console.warn(formatEntry(createEntry("WARN", message, context)));
  },
};
```

- [ ] **Step 2: logger.test.ts에서 error 관련 테스트 제거**

`__tests__/errors/logger.test.ts`를 열어 `logger.error` 또는 "ERROR" 레벨 관련 `describe`/`it` 블록을 모두 제거. 남은 debug/info/warn 테스트는 `__DEV__=true` 가드 하에 동작하도록 필요 시 `setDev(true)` 추가. (기존 테스트가 이미 `__DEV__=true` 상태에서 실행되므로 대체로 영향 없음. 실제 영향이 있으면 테스트 상단에 `(globalThis as any).__DEV__ = true`를 명시.)

- [ ] **Step 3: 테스트 실행**

Run: `npx jest __tests__/errors/logger.test.ts`
Expected: 남은 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/core/errors/logger.ts __tests__/errors/logger.test.ts
git commit -m "refactor(errors): shrink logger to dev-only debug/info/warn"
```

---

### Task 14: handleError 갱신

**Files:**
- Modify: `src/core/errors/handleError.ts`
- Modify: `__tests__/errors/handleError.test.ts`

- [ ] **Step 1: handleError.ts 변경**

```ts
// src/core/errors/handleError.ts
import { AppError } from "@/src/core/errors/AppError";
import { UnknownError } from "@/src/core/errors/UnknownError";

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new UnknownError({ context: { originalMessage: error.message }, cause: error });
  }
  return new UnknownError({ context: { rawValue: String(error) } });
}

type ToastSink = {
  show(message: string): void;
};

type ReporterLike = {
  report(error: AppError): Promise<void>;
};

export function createErrorHandler(toast: ToastSink, reporter: ReporterLike) {
  return function handleError(error: unknown): void {
    const appError = normalizeError(error);
    void reporter.report(appError);
    toast.show(appError.userMessage);
  };
}
```

- [ ] **Step 2: handleError.test.ts 갱신**

기존 `console.error` 스파이 대신 `FakeErrorSink` 기반 reporter를 주입:

```ts
// __tests__/errors/handleError.test.ts
import { DeckSaveError, UnknownError } from "@/src/core/errors";
import { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";
import { setupI18nForTest } from "@/__tests__/helpers/i18nTestSetup";
import type { AppError } from "@/src/core/errors";

beforeAll(async () => {
  await setupI18nForTest("ko");
});

describe("normalizeError", () => {
  it("returns AppError as-is", () => {
    const error = new DeckSaveError({ context: { deckId: "d1" } });
    expect(normalizeError(error)).toBe(error);
  });

  it("wraps plain Error in UnknownError with originalMessage", () => {
    const error = new Error("something broke");
    const result = normalizeError(error);
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ originalMessage: "something broke" });
    expect(result.cause).toBe(error);
  });

  it("wraps string in UnknownError with rawValue", () => {
    const result = normalizeError("oops");
    expect(result.context).toEqual({ rawValue: "oops" });
  });

  it("wraps undefined in UnknownError with rawValue", () => {
    const result = normalizeError(undefined);
    expect(result.context).toEqual({ rawValue: "undefined" });
  });

  it("wraps null in UnknownError with rawValue", () => {
    const result = normalizeError(null);
    expect(result.context).toEqual({ rawValue: "null" });
  });
});

describe("createErrorHandler", () => {
  function setup() {
    const received: AppError[] = [];
    const reporter = {
      report: async (err: AppError) => { received.push(err); },
    };
    const toastShown: string[] = [];
    const toast = { show: (m: string) => { toastShown.push(m); } };
    const handleError = createErrorHandler(toast, reporter);
    return { received, toastShown, handleError };
  }

  it("reports AppError and shows localized toast", async () => {
    const { received, toastShown, handleError } = setup();
    handleError(new DeckSaveError());
    // allow fire-and-forget report to resolve
    await new Promise((r) => setImmediate(r));
    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(DeckSaveError);
    expect(toastShown).toEqual(["덱 저장에 실패했습니다."]);
  });

  it("normalizes plain Error before handling", async () => {
    const { received, toastShown, handleError } = setup();
    handleError(new Error("raw error"));
    await new Promise((r) => setImmediate(r));
    expect(received[0]).toBeInstanceOf(UnknownError);
    expect(toastShown).toEqual(["알 수 없는 오류가 발생했습니다."]);
  });

  it("normalizes non-Error values before handling", async () => {
    const { toastShown, handleError } = setup();
    handleError("string error");
    await new Promise((r) => setImmediate(r));
    expect(toastShown).toEqual(["알 수 없는 오류가 발생했습니다."]);
  });
});
```

- [ ] **Step 3: 테스트 실행**

Run: `npx jest __tests__/errors/handleError.test.ts`
Expected: 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/core/errors/handleError.ts __tests__/errors/handleError.test.ts
git commit -m "refactor(errors): inject ErrorReporter into createErrorHandler"
```

---

### Task 15: Global Error Handler

**Files:**
- Create: `src/core/observability/globalHandler.ts`

- [ ] **Step 1: 구현**

```ts
// src/core/observability/globalHandler.ts
import tracking from "promise/setimmediate/rejection-tracking";

import { normalizeError } from "@/src/core/errors/handleError";
import type { ErrorReporter } from "@/src/core/observability/errorReporter";

type ErrorUtilsLike = {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
};

declare const ErrorUtils: ErrorUtilsLike;

export function installGlobalErrorHandler(reporter: ErrorReporter): void {
  if (typeof ErrorUtils !== "undefined") {
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      void reporter.report(normalizeError(error));
      prev(error, isFatal);
    });
  }

  tracking.enable({
    allRejections: true,
    onUnhandled: (_id: number, error: unknown) => {
      void reporter.report(normalizeError(error));
    },
    onHandled: () => {},
  });
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 통과. `promise/setimmediate/rejection-tracking` 타입이 없으면 `src/types/promise-tracking.d.ts`에 선언 추가:

```ts
// src/types/promise-tracking.d.ts
declare module "promise/setimmediate/rejection-tracking" {
  const tracking: {
    enable(options: {
      allRejections?: boolean;
      onUnhandled?: (id: number, error: unknown) => void;
      onHandled?: (id: number) => void;
    }): void;
  };
  export default tracking;
}
```

그리고 `tsconfig.json`의 `include`/`typeRoots`에 이 파일이 포함되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/core/observability/globalHandler.ts src/types/promise-tracking.d.ts
git commit -m "feat(observability): add global RN + promise rejection capture"
```

---

### Task 16: ObservabilityErrorBoundary

**Files:**
- Create: `src/app/ObservabilityErrorBoundary.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/app/ObservabilityErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { normalizeError } from "@/src/core/errors/handleError";
import { getErrorReporter } from "@/src/core/observability";
import { tokens } from "@/src/shared/theme/tokens";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

export class ObservabilityErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    try {
      void getErrorReporter().report(normalizeError(error));
    } catch {
      // observability not initialized — fall through to fallback UI
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }
    return this.props.children;
  }
}

function DefaultFallback() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오류가 발생했습니다</Text>
      <Text style={styles.body}>앱을 재시작해 주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.xl,
  },
  title: {
    ...tokens.typography.hero,
    marginBottom: tokens.spacing.m,
  },
  body: {
    ...tokens.typography.body,
  },
});
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/app/ObservabilityErrorBoundary.tsx
git commit -m "feat(observability): add React ErrorBoundary with reporter hook"
```

---

### Task 17: Bootstrap 와이어업

**Files:**
- Modify: `src/app/AppProviders.tsx`
- Modify: `src/app/bootstrap/AppBootstrapGate.tsx`

- [ ] **Step 1: AppProviders 수정**

```tsx
// src/app/AppProviders.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ObservabilityErrorBoundary } from "@/src/app/ObservabilityErrorBoundary";
import { createErrorHandler } from "@/src/core/errors/handleError";
import { getErrorReporter } from "@/src/core/observability";
import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { i18next } from "@/src/shared/i18n";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";
import { ToastProvider, useToast } from "@/src/shared/ui/toast";

const AppServicesContext = createContext<AppServices | null>(null);

function QueryLayer({ children }: PropsWithChildren) {
  const toast = useToast();
  const [queryClient] = useState(() => {
    const handleError = createErrorHandler(toast, getErrorReporter());
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000 },
        mutations: { onError: handleError },
      },
    });
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [services] = useState(() => createAppServices());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18next}>
          <ThemeProvider>
            <ToastProvider>
              <AppServicesContext.Provider value={services}>
                <ObservabilityErrorBoundary>
                  <QueryLayer>{children}</QueryLayer>
                </ObservabilityErrorBoundary>
              </AppServicesContext.Provider>
            </ToastProvider>
          </ThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error("AppServicesContext is not available.");
  return services;
}
```

**Note**: `getErrorReporter()`가 `QueryLayer` 마운트 시점에 호출되므로, 그 전에 `initializeObservability()`가 완료돼야 함. 이는 `AppBootstrapGate`가 `QueryLayer` 안쪽 자식이므로 구조상 문제 발생 — 수정이 필요. 실제로는 `createErrorHandler` 호출을 `QueryLayer` 내부 useState 초기화 지점에서 `AppBootstrapGate`의 "ready" 상태 이후로 지연시키거나, **Observability를 `AppProviders` 최초 마운트 시 useEffect가 아닌 `useState` 초기화에서 동기적으로 초기화하되 비동기 installId는 `ContextEnricher`가 `Promise<string>` 대기**하도록 구조 조정 필요. 이 Task에서는 **가장 단순한 해법을 채택**: 아래 Step 2에서 `AppBootstrapGate`가 `initializeObservability()`를 마친 뒤에야 자식을 렌더하도록 하고, `QueryLayer`를 `ObservabilityErrorBoundary`와 함께 `AppBootstrapGate`의 children 안쪽으로 옮긴다.

아래 수정본으로 교체:

```tsx
// src/app/AppProviders.tsx (최종)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createErrorHandler } from "@/src/core/errors/handleError";
import { getErrorReporter } from "@/src/core/observability";
import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { i18next } from "@/src/shared/i18n";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";
import { ToastProvider, useToast } from "@/src/shared/ui/toast";

const AppServicesContext = createContext<AppServices | null>(null);

export function QueryLayer({ children }: PropsWithChildren) {
  const toast = useToast();
  const [queryClient] = useState(() => {
    const handleError = createErrorHandler(toast, getErrorReporter());
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000 },
        mutations: { onError: handleError },
      },
    });
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [services] = useState(() => createAppServices());
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18next}>
          <ThemeProvider>
            <ToastProvider>
              <AppServicesContext.Provider value={services}>
                {children}
              </AppServicesContext.Provider>
            </ToastProvider>
          </ThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error("AppServicesContext is not available.");
  return services;
}
```

`QueryLayer`는 이제 export만 되고, `AppBootstrapGate` 안쪽에서 사용됨.

- [ ] **Step 2: AppBootstrapGate 수정**

```tsx
// src/app/bootstrap/AppBootstrapGate.tsx
import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ObservabilityErrorBoundary } from "@/src/app/ObservabilityErrorBoundary";
import { QueryLayer, useAppServices } from "@/src/app/AppProviders";
import { AppError } from "@/src/core/errors";
import {
  ConsoleAnalyticsSink,
  ConsoleErrorSink,
  getAnalytics,
  initializeObservability,
} from "@/src/core/observability";
import { installGlobalErrorHandler } from "@/src/core/observability/globalHandler";
import { getErrorReporter } from "@/src/core/observability";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService, localeService } = useAppServices();
  const { colors } = useTheme();
  const { t } = useT();
  const [state, setState] = useState<BootstrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function prepare() {
      try {
        setState("loading");
        await bootstrapService.prepareAppAsync();
        await initializeObservability({
          errorSink: new ConsoleErrorSink(),
          analyticsSink: new ConsoleAnalyticsSink(),
          localeService,
        });
        installGlobalErrorHandler(getErrorReporter());
        void getAnalytics().track("app_opened");
        if (isMounted) setState("ready");
      } catch (error) {
        if (isMounted) {
          setState("error");
          if (error instanceof AppError) {
            setErrorMessage(t(error.messageKey, error.messageParams));
          } else if (error instanceof Error) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage(t("errors.unknown"));
          }
        }
      }
    }
    void prepare();
    return () => { isMounted = false; };
  }, [bootstrapService, localeService, t]);

  if (state === "ready") {
    return (
      <ObservabilityErrorBoundary>
        <QueryLayer>{children}</QueryLayer>
      </ObservabilityErrorBoundary>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Flash Voca</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {state === "error" ? "Startup issue" : "Preparing local-first workspace"}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          {state === "error" ? errorMessage : "SQLite schema, sample data, and service boundaries are loading."}
        </Text>
        {state !== "error" ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: tokens.spacing.xl },
  card: { width: "100%", maxWidth: 420, borderRadius: tokens.radius.l, padding: tokens.spacing.xl, borderWidth: 1, gap: tokens.spacing.s },
  eyebrow: { ...tokens.typography.label, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { ...tokens.typography.hero },
  message: { ...tokens.typography.body },
  loader: { marginTop: tokens.spacing.s },
});
```

- [ ] **Step 3: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: 통과.

- [ ] **Step 4: 전체 테스트 실행**

Run: `npm test`
Expected: 전부 PASS. 실패 시 Jest 환경에서 `initializeObservability`가 호출되지 않아 `getErrorReporter()`가 throw할 수 있음 — 테스트에서 이 함수를 호출하는 곳은 `QueryLayer`인데, 현재 테스트는 `QueryLayer`를 직접 렌더하지 않으므로 영향 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/app/AppProviders.tsx src/app/bootstrap/AppBootstrapGate.tsx
git commit -m "feat(observability): wire init into bootstrap and mount ErrorBoundary"
```

---

### Task 18: 시드 분석 이벤트 호출부

**Files:**
- Modify: `src/core/services/DeckService.ts`
- Modify: `src/core/services/StudySessionService.ts`

- [ ] **Step 1: DeckService에 deck_created / deck_deleted 이벤트 추가**

`DeckService.ts`를 열어 `create` 성공 경로와 `delete` 성공 경로 직후에 `getAnalytics().track(...)` 호출 추가. 예시 형태:

```ts
// src/core/services/DeckService.ts (발췌)
import { getAnalytics } from "@/src/core/observability";

export class DeckService {
  // ...
  async create(input: CreateDeckInput): Promise<Deck> {
    const deck = await this.repository.save(input);
    void getAnalytics().track("deck_created", {
      cardCount: deck.cards.length,
      isCustom: deck.isCustom ?? false,
    });
    return deck;
  }

  async delete(deckId: string): Promise<void> {
    const deck = await this.repository.findById(deckId);
    await this.repository.delete(deckId);
    void getAnalytics().track("deck_deleted", {
      cardCount: deck?.cards.length ?? 0,
    });
  }
}
```

실제 메서드 시그니처·반환 타입은 현재 파일에 맞춤. `deck.cards`가 없다면 적절한 카운트 필드로 대체. `isCustom` 속성이 없다면 레지스트리(`allowedProps`)에서 해당 속성 제거.

- [ ] **Step 2: StudySessionService에 study_session_started / completed 이벤트 추가**

현재 `StudySessionService.ts`의 세션 시작/종료 메서드 양쪽에 다음 패턴 삽입:

```ts
// src/core/services/StudySessionService.ts (발췌)
import { getAnalytics } from "@/src/core/observability";

export class StudySessionService {
  async start(deckId: string, sessionMode: string): Promise<Session> {
    const session = await this.repository.createSession(deckId);
    void getAnalytics().track("study_session_started", { deckId, sessionMode });
    return session;
  }

  async complete(session: Session): Promise<void> {
    // ...기존 로직
    void getAnalytics().track("study_session_completed", {
      deckId: session.deckId,
      cardsStudied: session.studiedCount,
      durationSec: Math.round((Date.now() - session.startedAtMs) / 1000),
      correctRate: session.correctRate,
    });
  }
}
```

실제 필드 이름은 현재 `StudySessionService`의 state 모델에 맞춰 매핑. 없는 필드는 레지스트리에서 제거(화이트리스트는 레지스트리 쪽에서 일치시킴).

- [ ] **Step 3: 기존 서비스 테스트가 `getAnalytics()` 초기화 없이 실패하는지 확인**

Run: `npx jest __tests__/services/DeckService.test.ts __tests__/services/StudySessionService.test.ts`
Expected: `getAnalytics is not initialized` 에러 가능.

해결: 서비스 테스트 상단에서 `initializeObservability`를 호출하거나, 더 단순하게 **`getAnalytics`를 DI로 주입하는 대신 초기화 실패 시 조용히 건너뛰는 방어 코드**를 서비스 호출부에 추가:

```ts
// 서비스 내 도우미
function trackSafely<N extends AnalyticsEventName>(
  name: N,
  props?: AnalyticsEventProperties<N>,
): void {
  try {
    void getAnalytics().track(name, props);
  } catch {
    // observability not initialized (e.g. test env) — skip
  }
}
```

서비스별로 이 헬퍼를 로컬로 만들어 사용하거나, `src/core/observability/index.ts`에 `trackSafely` export를 추가. 선택: 후자가 DRY. index.ts에 다음 추가:

```ts
// src/core/observability/index.ts (추가)
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "@/src/core/observability/eventRegistry";

export function trackSafely<N extends AnalyticsEventName>(
  name: N,
  props?: AnalyticsEventProperties<N>,
): void {
  try {
    void getAnalytics().track(name, props);
  } catch {
    // no-op when observability not initialized
  }
}
```

서비스 호출부는 `trackSafely(...)`로 교체.

- [ ] **Step 4: 전체 테스트 실행**

Run: `npm test`
Expected: 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/observability/index.ts src/core/services/DeckService.ts src/core/services/StudySessionService.ts
git commit -m "feat(observability): seed analytics events in deck and study flows"
```

---

### Task 19: QA Smoke Checklist 문서

**Files:**
- Create: `docs/qa/observability-smoke.md`

- [ ] **Step 1: 문서 작성**

```markdown
# Observability Smoke Checklist

관측성 기반 구현 후 수동 검증. 벤더 붙일 때 회귀 테스트로 재활용.

## 준비
- Android 에뮬레이터 실행 (`npx expo run:android`)
- Metro 콘솔 열어두기

## 체크 항목

### 1. 개발 빌드 에러 캡처
- [ ] 앱 내 임의 위치에 `throw new Error("smoke 1")` 삽입 → 콘솔에 `ErrorReport` JSON 구조화 출력 확인
- [ ] `userMessage`, `observability.installId`, `observability.sessionId` 필드 포함 확인

### 2. Promise rejection
- [ ] 임의 버튼에 `Promise.reject(new Error("smoke 2"))` 연결 → 콘솔에 리포트 출력 확인
- [ ] 기존 RN dev 경고(Yellow/Red Box)도 여전히 표시됨

### 3. ErrorBoundary
- [ ] 자식 컴포넌트에서 `throw new Error("smoke 3")` → fallback UI("오류가 발생했습니다") 렌더
- [ ] 콘솔에 리포트 출력 확인

### 4. Install ID / Session ID
- [ ] 앱 종료 후 재실행 → `installId` 동일, `sessionId` 상이

### 5. 시드 분석 이벤트
- [ ] 앱 시작 시 `app_opened` 이벤트 로그 출력
- [ ] 새 덱 생성 → `deck_created` 이벤트 로그
- [ ] 덱 삭제 → `deck_deleted` 이벤트 로그
- [ ] 학습 세션 시작 → `study_session_started` 이벤트 로그
- [ ] 학습 세션 종료 → `study_session_completed` 이벤트 로그

### 6. 브레드크럼 첨부
- [ ] 덱 생성 후 즉시 throw → 에러 리포트의 `breadcrumbs`에 `deck_created` 포함 확인

### 7. PII 스크러빙 (수동 확인)
- [ ] AppError의 context에 `{ deckName: "테스트" }` 같은 미등록 키 넣어 throw → 리포트의 `context`에 `deckName` 없음 확인

### 8. 프로덕션 빌드 동의 게이트 (선택)
- [ ] 릴리스 빌드에서 에러 발생 → 동의 설정 전엔 sink 호출 안 됨
- [ ] DB의 `app_meta`에 `consent_error_reports=true` 수동 삽입 → 이후 발생 에러는 리포트됨
```

- [ ] **Step 2: 커밋**

```bash
mkdir -p docs/qa
git add docs/qa/observability-smoke.md
git commit -m "docs(observability): add manual smoke qa checklist"
```

---

### Task 20: 최종 검증

- [ ] **Step 1: typecheck**

Run: `npm run typecheck`
Expected: 통과.

- [ ] **Step 2: lint**

Run: `npm run lint`
Expected: 통과.

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS.

- [ ] **Step 4: 앱 실행 & 스모크**

Run: `npx expo run:android`
Expected: 앱 부팅 성공. 콘솔에 `app_opened` 이벤트 출력 확인.

`docs/qa/observability-smoke.md` 항목 1~7 실행. 실패하는 항목이 있으면 해당 Task로 돌아가 수정.

- [ ] **Step 5: 완료 커밋 (있는 경우)**

스모크 중 발견한 수정사항이 있으면 별도 커밋. 없으면 스킵.

```bash
# 예시
git add <수정 파일>
git commit -m "fix(observability): <상세>"
```

---

## 변경 요약

신규 모듈: `src/core/observability/` 아래 9개 파일 + `sinks/` 3개.
신규 테스트: `__tests__/observability/` 아래 7개 테스트 + helpers 2개.
기존 수정: `src/core/errors/logger.ts` (축소), `src/core/errors/handleError.ts` (시그니처 확장), `src/app/AppProviders.tsx` (구조 변경), `src/app/bootstrap/AppBootstrapGate.tsx` (observability 초기화), 서비스 2개에 이벤트 트래킹.
신규 문서: `docs/qa/observability-smoke.md`.
