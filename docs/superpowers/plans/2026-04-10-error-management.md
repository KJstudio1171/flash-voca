# Error Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flash Voca 앱 전체에 계층적 에러 클래스, 구조화된 로거, 토스트 UI, 글로벌 에러 핸들러를 도입하고 기존 코드를 마이그레이션한다.

**Architecture:** 커스텀 Error 클래스 계층(AppError > DatabaseError/NetworkError > 구체 에러)으로 에러를 분류한다. TanStack Query의 글로벌 mutation onError에서 로거와 토스트를 자동 호출한다. Repository에서 try-catch로 원본 에러를 커스텀 에러로 감싸고, Service는 그대로 전파한다.

**Tech Stack:** TypeScript, React Native Animated API, TanStack Query, expo-sqlite

**Spec:** `docs/superpowers/specs/2026-04-10-error-management-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `src/core/errors/AppError.ts` | 추상 베이스 에러 클래스 |
| `src/core/errors/DatabaseError.ts` | DB 카테고리 에러: DeckSaveError, DeckDeleteError, DeckNotFoundError, StudyRecordError, BootstrapError, BundleQueryError, EntitlementCacheError |
| `src/core/errors/NetworkError.ts` | 네트워크 카테고리 에러: SyncError, EntitlementFetchError |
| `src/core/errors/UnknownError.ts` | 분류 불가 에러 |
| `src/core/errors/logger.ts` | 구조화된 콘솔 로거 |
| `src/core/errors/handleError.ts` | normalizeError + createErrorHandler |
| `src/core/errors/index.ts` | re-export barrel |
| `src/shared/ui/toast/ToastProvider.tsx` | Toast context + 상태 관리 + useToast hook |
| `src/shared/ui/toast/ToastContainer.tsx` | 토스트 렌더링 컴포넌트 |
| `src/shared/ui/toast/index.ts` | re-export barrel |
| `__tests__/errors/AppError.test.ts` | 에러 클래스 테스트 |
| `__tests__/errors/logger.test.ts` | 로거 테스트 |
| `__tests__/errors/handleError.test.ts` | handleError 테스트 |

### Modified files

| File | Change |
|------|--------|
| `src/core/repositories/sqlite/SqliteDeckRepository.ts` | saveDeckAsync, deleteDeckAsync에 try-catch + 커스텀 에러 |
| `src/core/repositories/sqlite/SqliteStudyRepository.ts` | logReviewAsync에 try-catch + StudyRecordError |
| `src/core/repositories/sqlite/SqliteBundleRepository.ts` | listBundlesAsync, getBundleByIdAsync에 try-catch + BundleQueryError |
| `src/core/repositories/sqlite/SqliteEntitlementRepository.ts` | 모든 메서드에 try-catch + EntitlementCacheError |
| `src/core/repositories/supabase/SupabaseEntitlementGateway.ts` | throw new Error → throw new EntitlementFetchError |
| `src/core/services/BootstrapService.ts` | try-catch + BootstrapError |
| `src/features/study/hooks/useStudySession.ts` | lastError, onError 관련 코드 제거 |
| `src/features/study/screens/StudyScreen.tsx` | onError 콜백 제거, query 에러에 AppError 활용 |
| `src/app/bootstrap/AppBootstrapGate.tsx` | catch에서 BootstrapError.userMessage 활용 |
| `src/app/AppProviders.tsx` | ToastProvider 추가, QueryClient 글로벌 mutation onError 연결 |

---

### Task 1: Error Class Hierarchy

**Files:**
- Create: `src/core/errors/AppError.ts`
- Create: `src/core/errors/DatabaseError.ts`
- Create: `src/core/errors/NetworkError.ts`
- Create: `src/core/errors/UnknownError.ts`
- Create: `src/core/errors/index.ts`
- Test: `__tests__/errors/AppError.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/errors/AppError.test.ts
import {
  AppError,
  DatabaseError,
  DeckSaveError,
  DeckDeleteError,
  DeckNotFoundError,
  StudyRecordError,
  BootstrapError,
  BundleQueryError,
  EntitlementCacheError,
  NetworkError,
  SyncError,
  EntitlementFetchError,
  UnknownError,
} from "@/src/core/errors";

describe("Error class hierarchy", () => {
  describe("DeckSaveError", () => {
    it("is an instance of AppError and DatabaseError", () => {
      const error = new DeckSaveError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(DeckSaveError);
      expect(error).toBeInstanceOf(Error);
    });

    it("has correct category, userMessage, and name", () => {
      const error = new DeckSaveError();
      expect(error.category).toBe("database");
      expect(error.userMessage).toBe("덱 저장에 실패했습니다.");
      expect(error.name).toBe("DeckSaveError");
      expect(error.message).toBe("Deck save failed");
    });

    it("stores context and timestamp", () => {
      const error = new DeckSaveError({ context: { deckId: "deck-1" } });
      expect(error.context).toEqual({ deckId: "deck-1" });
      expect(error.timestamp).toBeDefined();
      expect(() => new Date(error.timestamp).toISOString()).not.toThrow();
    });

    it("stores cause", () => {
      const cause = new Error("sqlite error");
      const error = new DeckSaveError({ cause });
      expect(error.cause).toBe(cause);
    });
  });

  describe("DeckDeleteError", () => {
    it("has correct properties", () => {
      const error = new DeckDeleteError({ context: { deckId: "d1" } });
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.category).toBe("database");
      expect(error.userMessage).toBe("덱 삭제에 실패했습니다.");
      expect(error.name).toBe("DeckDeleteError");
    });
  });

  describe("DeckNotFoundError", () => {
    it("has correct properties", () => {
      const error = new DeckNotFoundError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("덱을 찾을 수 없습니다.");
    });
  });

  describe("StudyRecordError", () => {
    it("has correct properties", () => {
      const error = new StudyRecordError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("학습 기록 저장에 실패했습니다.");
    });
  });

  describe("BootstrapError", () => {
    it("has correct properties", () => {
      const error = new BootstrapError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("앱 초기화에 실패했습니다.");
    });
  });

  describe("BundleQueryError", () => {
    it("has correct properties", () => {
      const error = new BundleQueryError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("번들 정보를 불러올 수 없습니다.");
    });
  });

  describe("EntitlementCacheError", () => {
    it("has correct properties", () => {
      const error = new EntitlementCacheError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("구매 캐시 처리에 실패했습니다.");
    });
  });

  describe("SyncError", () => {
    it("is an instance of NetworkError", () => {
      const error = new SyncError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.category).toBe("network");
      expect(error.userMessage).toBe("동기화에 실패했습니다.");
    });
  });

  describe("EntitlementFetchError", () => {
    it("has correct properties", () => {
      const error = new EntitlementFetchError();
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.userMessage).toBe("구매 정보를 불러올 수 없습니다.");
    });
  });

  describe("UnknownError", () => {
    it("has correct properties", () => {
      const error = new UnknownError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe("unknown");
      expect(error.userMessage).toBe("알 수 없는 오류가 발생했습니다.");
    });

    it("is not an instance of DatabaseError or NetworkError", () => {
      const error = new UnknownError();
      expect(error).not.toBeInstanceOf(DatabaseError);
      expect(error).not.toBeInstanceOf(NetworkError);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/errors/AppError.test.ts`
Expected: FAIL — cannot find module `@/src/core/errors`

- [ ] **Step 3: Implement AppError base class**

```ts
// src/core/errors/AppError.ts
export type AppErrorOptions = {
  context?: Record<string, unknown>;
  cause?: unknown;
};

export abstract class AppError extends Error {
  abstract readonly category: string;
  abstract readonly userMessage: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.context = options?.context;
    this.timestamp = new Date().toISOString();
  }
}
```

- [ ] **Step 4: Implement DatabaseError and subclasses**

```ts
// src/core/errors/DatabaseError.ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";

export abstract class DatabaseError extends AppError {
  readonly category = "database";
}

export class DeckSaveError extends DatabaseError {
  readonly userMessage = "덱 저장에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Deck save failed", options);
  }
}

export class DeckDeleteError extends DatabaseError {
  readonly userMessage = "덱 삭제에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Deck delete failed", options);
  }
}

export class DeckNotFoundError extends DatabaseError {
  readonly userMessage = "덱을 찾을 수 없습니다.";
  constructor(options?: AppErrorOptions) {
    super("Deck not found", options);
  }
}

export class StudyRecordError extends DatabaseError {
  readonly userMessage = "학습 기록 저장에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Study record save failed", options);
  }
}

export class BootstrapError extends DatabaseError {
  readonly userMessage = "앱 초기화에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("App bootstrap failed", options);
  }
}

export class BundleQueryError extends DatabaseError {
  readonly userMessage = "번들 정보를 불러올 수 없습니다.";
  constructor(options?: AppErrorOptions) {
    super("Bundle query failed", options);
  }
}

export class EntitlementCacheError extends DatabaseError {
  readonly userMessage = "구매 캐시 처리에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Entitlement cache operation failed", options);
  }
}
```

- [ ] **Step 5: Implement NetworkError and subclasses**

```ts
// src/core/errors/NetworkError.ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";

export abstract class NetworkError extends AppError {
  readonly category = "network";
}

export class SyncError extends NetworkError {
  readonly userMessage = "동기화에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Sync failed", options);
  }
}

export class EntitlementFetchError extends NetworkError {
  readonly userMessage = "구매 정보를 불러올 수 없습니다.";
  constructor(options?: AppErrorOptions) {
    super("Entitlement fetch failed", options);
  }
}
```

- [ ] **Step 6: Implement UnknownError**

```ts
// src/core/errors/UnknownError.ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";

export class UnknownError extends AppError {
  readonly category = "unknown";
  readonly userMessage = "알 수 없는 오류가 발생했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Unknown error", options);
  }
}
```

- [ ] **Step 7: Create barrel index**

```ts
// src/core/errors/index.ts
export { AppError } from "@/src/core/errors/AppError";
export type { AppErrorOptions } from "@/src/core/errors/AppError";
export {
  DatabaseError,
  DeckSaveError,
  DeckDeleteError,
  DeckNotFoundError,
  StudyRecordError,
  BootstrapError,
  BundleQueryError,
  EntitlementCacheError,
} from "@/src/core/errors/DatabaseError";
export { NetworkError, SyncError, EntitlementFetchError } from "@/src/core/errors/NetworkError";
export { UnknownError } from "@/src/core/errors/UnknownError";
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest __tests__/errors/AppError.test.ts`
Expected: all 12 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/core/errors/ __tests__/errors/AppError.test.ts
git commit -m "feat: add error class hierarchy with AppError, DatabaseError, NetworkError, UnknownError"
```

---

### Task 2: Structured Logger

**Files:**
- Create: `src/core/errors/logger.ts`
- Test: `__tests__/errors/logger.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/errors/logger.test.ts
import { DeckSaveError } from "@/src/core/errors";
import { logger } from "@/src/core/errors/logger";

describe("logger", () => {
  beforeEach(() => {
    jest.spyOn(console, "debug").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("error", () => {
    it("logs AppError as structured JSON to console.error", () => {
      const appError = new DeckSaveError({ context: { deckId: "deck-1" } });
      logger.error(appError);

      expect(console.error).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("ERROR");
      expect(logged.category).toBe("database");
      expect(logged.message).toBe("DeckSaveError: Deck save failed");
      expect(logged.context).toEqual({ deckId: "deck-1" });
      expect(logged.timestamp).toBe(appError.timestamp);
    });
  });

  describe("debug", () => {
    it("logs to console.debug with app category", () => {
      logger.debug("test message", { key: "value" });

      expect(console.debug).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.debug as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("DEBUG");
      expect(logged.category).toBe("app");
      expect(logged.message).toBe("test message");
      expect(logged.context).toEqual({ key: "value" });
    });
  });

  describe("info", () => {
    it("logs to console.info", () => {
      logger.info("info message");

      expect(console.info).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.info as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("INFO");
      expect(logged.message).toBe("info message");
    });
  });

  describe("warn", () => {
    it("logs to console.warn", () => {
      logger.warn("warn message");

      expect(console.warn).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.warn as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("WARN");
      expect(logged.message).toBe("warn message");
    });
  });

  describe("context omission", () => {
    it("omits context from entry when not provided", () => {
      logger.info("no context");

      const logged = JSON.parse((console.info as jest.Mock).mock.calls[0][0]);
      expect(logged.context).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/errors/logger.test.ts`
Expected: FAIL — cannot find module `@/src/core/errors/logger`

- [ ] **Step 3: Implement logger**

```ts
// src/core/errors/logger.ts
import { AppError } from "@/src/core/errors/AppError";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

type LogEntry = {
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

function formatEntry(entry: LogEntry): string {
  const output: LogEntry = { ...entry };
  if (output.context === undefined) {
    delete output.context;
  }
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

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(formatEntry(createEntry("DEBUG", message, context)));
  },

  info(message: string, context?: Record<string, unknown>): void {
    console.info(formatEntry(createEntry("INFO", message, context)));
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatEntry(createEntry("WARN", message, context)));
  },

  error(appError: AppError): void {
    const entry: LogEntry = {
      level: "ERROR",
      category: appError.category,
      message: `${appError.name}: ${appError.message}`,
      context: appError.context,
      timestamp: appError.timestamp,
    };
    console.error(formatEntry(entry));
  },
};
```

- [ ] **Step 4: Export logger from barrel**

Add to `src/core/errors/index.ts`:
```ts
export { logger } from "@/src/core/errors/logger";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/errors/logger.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/errors/logger.ts src/core/errors/index.ts __tests__/errors/logger.test.ts
git commit -m "feat: add structured logger with JSON console output"
```

---

### Task 3: Global Error Handler

**Files:**
- Create: `src/core/errors/handleError.ts`
- Test: `__tests__/errors/handleError.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/errors/handleError.test.ts
import { DeckSaveError, UnknownError } from "@/src/core/errors";
import { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";

describe("normalizeError", () => {
  it("returns AppError as-is", () => {
    const error = new DeckSaveError({ context: { deckId: "d1" } });
    const result = normalizeError(error);
    expect(result).toBe(error);
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
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ rawValue: "oops" });
  });

  it("wraps undefined in UnknownError with rawValue", () => {
    const result = normalizeError(undefined);
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ rawValue: "undefined" });
  });

  it("wraps null in UnknownError with rawValue", () => {
    const result = normalizeError(null);
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ rawValue: "null" });
  });
});

describe("createErrorHandler", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls logger.error and toast.show for AppError", () => {
    const mockShow = jest.fn();
    const handleError = createErrorHandler({ show: mockShow });
    const error = new DeckSaveError();

    handleError(error);

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("덱 저장에 실패했습니다.");
  });

  it("normalizes plain Error before handling", () => {
    const mockShow = jest.fn();
    const handleError = createErrorHandler({ show: mockShow });

    handleError(new Error("raw error"));

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("알 수 없는 오류가 발생했습니다.");
  });

  it("normalizes non-Error values before handling", () => {
    const mockShow = jest.fn();
    const handleError = createErrorHandler({ show: mockShow });

    handleError("string error");

    expect(mockShow).toHaveBeenCalledWith("알 수 없는 오류가 발생했습니다.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/errors/handleError.test.ts`
Expected: FAIL — cannot find module `@/src/core/errors/handleError`

- [ ] **Step 3: Implement handleError**

```ts
// src/core/errors/handleError.ts
import { AppError } from "@/src/core/errors/AppError";
import { UnknownError } from "@/src/core/errors/UnknownError";
import { logger } from "@/src/core/errors/logger";

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new UnknownError({ context: { originalMessage: error.message }, cause: error });
  }
  return new UnknownError({ context: { rawValue: String(error) } });
}

type ToastSink = {
  show(message: string): void;
};

export function createErrorHandler(toast: ToastSink) {
  return function handleError(error: unknown): void {
    const appError = normalizeError(error);
    logger.error(appError);
    toast.show(appError.userMessage);
  };
}
```

- [ ] **Step 4: Export from barrel**

Add to `src/core/errors/index.ts`:
```ts
export { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/errors/handleError.test.ts`
Expected: all 8 tests PASS

- [ ] **Step 6: Run all error tests together**

Run: `npx jest __tests__/errors/`
Expected: all 25 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/core/errors/handleError.ts src/core/errors/index.ts __tests__/errors/handleError.test.ts
git commit -m "feat: add normalizeError and createErrorHandler for global error handling"
```

---

### Task 4: Toast UI System

**Files:**
- Create: `src/shared/ui/toast/ToastProvider.tsx`
- Create: `src/shared/ui/toast/ToastContainer.tsx`
- Create: `src/shared/ui/toast/index.ts`

- [ ] **Step 1: Create ToastProvider with context and useToast hook**

```tsx
// src/shared/ui/toast/ToastProvider.tsx
import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from "react";

import { ToastContainer } from "@/src/shared/ui/toast/ToastContainer";

type Toast = {
  id: string;
  message: string;
  duration: number;
};

type ToastContextValue = {
  show(message: string, duration?: number): void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, duration = DEFAULT_DURATION) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, duration }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
```

- [ ] **Step 2: Create ToastContainer component**

```tsx
// src/shared/ui/toast/ToastContainer.tsx
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type Toast = {
  id: string;
  message: string;
  duration: number;
};

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [opacity, toast.id, toast.duration, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.surfaceStrong, borderColor: colors.line, opacity },
      ]}
    >
      <Text style={[styles.message, { color: colors.ink }]}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: tokens.spacing.xl,
    left: tokens.layout.screenPadding,
    right: tokens.layout.screenPadding,
    alignItems: "center",
    gap: tokens.spacing.s,
  },
  toast: {
    width: "100%",
    paddingVertical: tokens.spacing.m,
    paddingHorizontal: tokens.layout.cardPadding,
    borderRadius: tokens.radius.s,
    borderWidth: 1,
  },
  message: {
    ...tokens.typography.body,
  },
});
```

- [ ] **Step 3: Create barrel index**

```ts
// src/shared/ui/toast/index.ts
export { ToastProvider, useToast } from "@/src/shared/ui/toast/ToastProvider";
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/toast/
git commit -m "feat: add toast UI system with ToastProvider and ToastContainer"
```

---

### Task 5: AppProviders Integration

**Files:**
- Modify: `src/app/AppProviders.tsx:1-46`

- [ ] **Step 1: Add ToastProvider and global mutation onError to AppProviders**

Replace the full content of `src/app/AppProviders.tsx`:

```tsx
// src/app/AppProviders.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createErrorHandler } from "@/src/core/errors/handleError";
import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";
import { ToastProvider, useToast } from "@/src/shared/ui/toast";

const AppServicesContext = createContext<AppServices | null>(null);

function QueryLayer({ children }: PropsWithChildren) {
  const toast = useToast();
  const [queryClient] = useState(() => {
    const handleError = createErrorHandler(toast);
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
        },
        mutations: {
          onError: handleError,
        },
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
        <ThemeProvider>
          <ToastProvider>
            <AppServicesContext.Provider value={services}>
              <QueryLayer>{children}</QueryLayer>
            </AppServicesContext.Provider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);

  if (!services) {
    throw new Error("AppServicesContext is not available.");
  }

  return services;
}
```

Key change: `ToastProvider`가 `QueryClientProvider` 바깥에 위치하여, `QueryClient` 생성 시 `useToast()`에 접근 가능. `QueryLayer` 내부 컴포넌트로 분리하여 이를 구현.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/AppProviders.tsx
git commit -m "feat: integrate ToastProvider and global mutation error handler in AppProviders"
```

---

### Task 6: Repository Migration — SqliteDeckRepository

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteDeckRepository.ts:135-254`

- [ ] **Step 1: Wrap saveDeckAsync in try-catch with DeckSaveError**

In `SqliteDeckRepository.ts`, wrap the body of `saveDeckAsync` (from `const db = await getDatabaseAsync()` through `return savedDeck`) in a try-catch. Replace the existing `throw new Error("Deck save failed")` at line 250-252.

The method should become:

```ts
async saveDeckAsync(payload: SaveDeckPayload) {
  const deckId = payload.id ?? createId("deck");
  try {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();
    const normalizedTitle = payload.title.trim();
    const normalizedDescription = normalizeOptionalText(payload.description);
    const accentColor = payload.accentColor ?? "#0F766E";
    const persistedCards = [...payload.cards]
      .sort((left, right) => left.position - right.position)
      .map((card) => ({
        id: card.id ?? createId("card"),
        term: card.term.trim(),
        meaning: card.meaning.trim(),
        example: normalizeOptionalText(card.example),
        note: normalizeOptionalText(card.note),
        position: card.position,
        createdAt: now,
        updatedAt: now,
      }));

    await db.withExclusiveTransactionAsync(async (tx) => {
      // ... existing transaction body (unchanged) ...
    });

    const savedDeck = await this.getDeckByIdAsync(deckId);

    if (!savedDeck) {
      throw new DeckSaveError({ context: { deckId } });
    }

    return savedDeck;
  } catch (error) {
    if (error instanceof DeckSaveError) {
      throw error;
    }
    throw new DeckSaveError({ context: { deckId }, cause: error });
  }
}
```

Add import at the top of the file:
```ts
import { DeckSaveError, DeckDeleteError } from "@/src/core/errors";
```

- [ ] **Step 2: Wrap deleteDeckAsync in try-catch with DeckDeleteError**

```ts
async deleteDeckAsync(deckId: string) {
  try {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      // ... existing transaction body (unchanged) ...
    });
  } catch (error) {
    if (error instanceof DeckDeleteError) {
      throw error;
    }
    throw new DeckDeleteError({ context: { deckId }, cause: error });
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/core/repositories/sqlite/SqliteDeckRepository.ts
git commit -m "refactor: wrap SqliteDeckRepository methods with custom error types"
```

---

### Task 7: Repository Migration — SqliteStudyRepository

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteStudyRepository.ts:53-185`

- [ ] **Step 1: Wrap logReviewAsync in try-catch with StudyRecordError**

Add import:
```ts
import { StudyRecordError } from "@/src/core/errors";
```

Wrap the body of `logReviewAsync`:

```ts
async logReviewAsync(input: LogReviewInput, userId: string) {
  try {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      // ... entire existing transaction body (unchanged) ...
    });
  } catch (error) {
    if (error instanceof StudyRecordError) {
      throw error;
    }
    throw new StudyRecordError({
      context: { deckId: input.deckId, cardId: input.cardId },
      cause: error,
    });
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/core/repositories/sqlite/SqliteStudyRepository.ts
git commit -m "refactor: wrap SqliteStudyRepository.logReviewAsync with StudyRecordError"
```

---

### Task 8: Repository Migration — SqliteBundleRepository + SqliteEntitlementRepository

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteBundleRepository.ts`
- Modify: `src/core/repositories/sqlite/SqliteEntitlementRepository.ts`

- [ ] **Step 1: Wrap SqliteBundleRepository methods**

Add import:
```ts
import { BundleQueryError } from "@/src/core/errors";
```

Wrap `listBundlesAsync`:
```ts
async listBundlesAsync() {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<BundleRow>(/* ... existing query ... */);
    return rows.map(mapBundle);
  } catch (error) {
    if (error instanceof BundleQueryError) {
      throw error;
    }
    throw new BundleQueryError({ cause: error });
  }
}
```

Wrap `getBundleByIdAsync`:
```ts
async getBundleByIdAsync(bundleId: string) {
  try {
    const db = await getDatabaseAsync();
    // ... entire existing body ...
  } catch (error) {
    if (error instanceof BundleQueryError) {
      throw error;
    }
    throw new BundleQueryError({ context: { bundleId }, cause: error });
  }
}
```

- [ ] **Step 2: Wrap SqliteEntitlementRepository methods**

Add import:
```ts
import { EntitlementCacheError } from "@/src/core/errors";
```

Wrap all four methods (`listActiveEntitlementsAsync`, `hasBundleAccessAsync`, `replaceCachedEntitlementsAsync`, `clearCachedEntitlementsAsync`) with the same pattern:

```ts
async listActiveEntitlementsAsync(userId: string) {
  try {
    const db = await getDatabaseAsync();
    return db.getAllAsync<Entitlement>(/* ... existing query ... */);
  } catch (error) {
    if (error instanceof EntitlementCacheError) {
      throw error;
    }
    throw new EntitlementCacheError({ context: { userId }, cause: error });
  }
}
```

```ts
async hasBundleAccessAsync(bundleId: string, userId: string) {
  try {
    const db = await getDatabaseAsync();
    // ... existing body ...
  } catch (error) {
    if (error instanceof EntitlementCacheError) {
      throw error;
    }
    throw new EntitlementCacheError({ context: { bundleId, userId }, cause: error });
  }
}
```

```ts
async replaceCachedEntitlementsAsync(userId: string, entitlements: Entitlement[]) {
  try {
    const db = await getDatabaseAsync();
    // ... existing body ...
  } catch (error) {
    if (error instanceof EntitlementCacheError) {
      throw error;
    }
    throw new EntitlementCacheError({ context: { userId }, cause: error });
  }
}
```

```ts
async clearCachedEntitlementsAsync(userId: string) {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM cached_entitlements WHERE user_id = ?;", [userId]);
  } catch (error) {
    if (error instanceof EntitlementCacheError) {
      throw error;
    }
    throw new EntitlementCacheError({ context: { userId }, cause: error });
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/core/repositories/sqlite/SqliteBundleRepository.ts src/core/repositories/sqlite/SqliteEntitlementRepository.ts
git commit -m "refactor: wrap SqliteBundleRepository and SqliteEntitlementRepository with custom errors"
```

---

### Task 9: Repository Migration — SupabaseEntitlementGateway

**Files:**
- Modify: `src/core/repositories/supabase/SupabaseEntitlementGateway.ts:19-21`

- [ ] **Step 1: Replace throw new Error with EntitlementFetchError**

Add import:
```ts
import { EntitlementFetchError } from "@/src/core/errors";
```

Replace line 20:
```ts
// Before:
throw new Error(error.message);

// After:
throw new EntitlementFetchError({ context: { userId }, cause: error });
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/core/repositories/supabase/SupabaseEntitlementGateway.ts
git commit -m "refactor: replace generic Error with EntitlementFetchError in SupabaseEntitlementGateway"
```

---

### Task 10: Service Migration — BootstrapService

**Files:**
- Modify: `src/core/services/BootstrapService.ts`

- [ ] **Step 1: Wrap prepareAppAsync with BootstrapError**

```ts
// src/core/services/BootstrapService.ts
import { BootstrapError } from "@/src/core/errors";
import { initializeDatabaseAsync } from "@/src/core/database/initialize";
import { seedMvpDataAsync } from "@/src/core/database/seed";

export class BootstrapService {
  async prepareAppAsync() {
    try {
      await initializeDatabaseAsync();
      await seedMvpDataAsync();
    } catch (error) {
      if (error instanceof BootstrapError) {
        throw error;
      }
      throw new BootstrapError({ cause: error });
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/core/services/BootstrapService.ts
git commit -m "refactor: wrap BootstrapService.prepareAppAsync with BootstrapError"
```

---

### Task 11: Screen Migration — useStudySession + StudyScreen

**Files:**
- Modify: `src/features/study/hooks/useStudySession.ts`
- Modify: `src/features/study/screens/StudyScreen.tsx`

- [ ] **Step 1: Remove onError/lastError from useStudySession**

Replace the full content of `src/features/study/hooks/useStudySession.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";

import { LogReviewInput, StudyCard } from "@/src/core/domain/models";

type StudyRating = 1 | 2 | 3;

type UseStudySessionOptions = {
  deckId: string;
  cards: StudyCard[];
  recordReview: (input: LogReviewInput) => void;
};

export function useStudySession({
  deckId,
  cards,
  recordReview,
}: UseStudySessionOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ratingCounts, setRatingCounts] = useState({ again: 0, good: 0, easy: 0 });
  const actionLockRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  const currentCard = cards[currentIndex] ?? null;
  const completed = cards.length > 0 && currentIndex >= cards.length;

  const restartSession = useCallback(() => {
    actionLockRef.current = false;
    startedAtRef.current = Date.now();
    setCurrentIndex(0);
    setIsTransitioning(false);
    setRatingCounts({ again: 0, good: 0, easy: 0 });
  }, []);

  useEffect(() => {
    restartSession();
  }, [deckId, restartSession]);

  useEffect(() => {
    actionLockRef.current = false;
    startedAtRef.current = Date.now();
    setIsTransitioning(false);
  }, [currentCard?.card.id]);

  const rateCard = useCallback(
    (rating: StudyRating) => {
      const activeCard = cards[currentIndex];

      if (!activeCard || actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setIsTransitioning(true);

      setRatingCounts((prev) => ({
        ...prev,
        ...(rating === 1 && { again: prev.again + 1 }),
        ...(rating === 2 && { good: prev.good + 1 }),
        ...(rating === 3 && { easy: prev.easy + 1 }),
      }));

      recordReview({
        deckId,
        cardId: activeCard.card.id,
        rating,
        elapsedMs: Math.max(0, Date.now() - startedAtRef.current),
      });

      setCurrentIndex((value) => value + 1);
    },
    [cards, currentIndex, deckId, recordReview],
  );

  return {
    completed,
    currentCard,
    currentIndex,
    isTransitioning,
    rateCard,
    ratingCounts,
    restartSession,
    totalCards: cards.length,
  };
}
```

Changes:
- `RecordReviewParams` 타입 제거. `recordReview`가 `LogReviewInput`을 직접 받음.
- `lastError` 상태 제거.
- `onError` 콜백 제거.
- 반환값에서 `lastError` 제거.

- [ ] **Step 2: Update StudyScreen to match new hook interface**

Replace the full content of `src/features/study/screens/StudyScreen.tsx`:

```tsx
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppError } from "@/src/core/errors";
import { SessionCompleteCard } from "@/src/features/study/components/SessionCompleteCard";
import { StudyFlashcard } from "@/src/features/study/components/StudyFlashcard";
import { StudyHeader } from "@/src/features/study/components/StudyHeader";
import {
  useRecordReviewMutation,
  useStudyDeckQuery,
} from "@/src/features/study/hooks/useStudyQueries";
import { useStudySession } from "@/src/features/study/hooks/useStudySession";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function StudyScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const studyQuery = useStudyDeckQuery(deckId);
  const reviewMutation = useRecordReviewMutation(deckId);
  const snapshot = studyQuery.data;
  const cards = snapshot?.cards ?? [];

  const session = useStudySession({
    deckId,
    cards,
    recordReview: reviewMutation.mutate,
  });

  const currentCard = session.currentCard;
  const hasSnapshot = snapshot != null;
  const showEmptyState = !studyQuery.isLoading && hasSnapshot && cards.length === 0;

  return (
    <Screen
      contentStyle={styles.content}
      scroll={false}
      title={snapshot?.deck.title ?? "Study"}
    >
      {hasSnapshot ? (
        <StudyHeader
          deckTitle={snapshot.deck.title}
          currentIndex={session.currentIndex}
          totalCards={session.totalCards}
          dueCount={snapshot.dueCount}
          masteredCount={snapshot.masteredCount}
        />
      ) : null}

      {studyQuery.isLoading && !hasSnapshot ? (
        <Panel>
          <Badge tone="info">Loading</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>학습 세션을 준비하고 있습니다.</Text>
        </Panel>
      ) : null}

      {studyQuery.isError ? (
        <Panel>
          <Badge tone="accent">Error</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {studyQuery.error instanceof AppError
              ? studyQuery.error.userMessage
              : "학습 데이터를 불러올 수 없습니다."}
          </Text>
        </Panel>
      ) : null}

      {showEmptyState ? (
        <Panel>
          <Badge tone="info">Empty</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            카드가 없습니다. 먼저 카드를 추가한 후 다시 시도하세요.
          </Text>
        </Panel>
      ) : null}

      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          disabled={session.isTransitioning}
          onRate={session.rateCard}
        />
      ) : null}

      {session.completed ? (
        <SessionCompleteCard
          totalCards={session.totalCards}
          masteredCount={snapshot?.masteredCount ?? 0}
          ratingCounts={session.ratingCounts}
          onRestart={session.restartSession}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.spacing.l,
  },
  body: {
    ...tokens.typography.body,
  },
});
```

Changes:
- `recordReview` 콜백을 `useCallback`으로 감싸지 않고 `reviewMutation.mutate`를 직접 전달.
- `session.lastError` 관련 JSX 블록 제거.
- Query 에러 메시지에 `AppError` instanceof 체크 추가.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Run existing tests**

Run: `npm test`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/study/hooks/useStudySession.ts src/features/study/screens/StudyScreen.tsx
git commit -m "refactor: remove local error handling from StudyScreen, delegate to global handler"
```

---

### Task 12: Screen Migration — AppBootstrapGate

**Files:**
- Modify: `src/app/bootstrap/AppBootstrapGate.tsx:26-31`

- [ ] **Step 1: Use AppError.userMessage in catch block**

Add import:
```ts
import { AppError } from "@/src/core/errors";
```

Replace the catch block (lines 26-31):

```ts
// Before:
} catch (error) {
  if (isMounted) {
    setState("error");
    setErrorMessage(
      error instanceof Error ? error.message : "Failed to bootstrap the app.",
    );
  }
}

// After:
} catch (error) {
  if (isMounted) {
    setState("error");
    setErrorMessage(
      error instanceof AppError
        ? error.userMessage
        : error instanceof Error
          ? error.message
          : "Failed to bootstrap the app.",
    );
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/bootstrap/AppBootstrapGate.tsx
git commit -m "refactor: use AppError.userMessage in AppBootstrapGate error display"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors (or only pre-existing warnings)

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: all tests PASS

- [ ] **Step 4: Verify error count**

Run: `grep -r "throw new Error" src/` to confirm no raw `throw new Error` remains in repository/service code. The only acceptable `throw new Error` should be in `AppProviders.tsx` (`useAppServices` context guard) and `ToastProvider.tsx` (`useToast` context guard).

- [ ] **Step 5: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "chore: final verification and lint fixes for error management system"
```
