# i18n Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱에 i18n 기반 인프라를 설치하고, `common` + `errors` 네임스페이스까지 번역 시스템으로 전환한다. 사용자 가시 변화 없이 다국어 기반이 동작하는 상태를 만든다.

**Architecture:** `src/shared/i18n/` 하위에 i18next 설정, `LocaleService`, 포맷 유틸, 로케일 JSON 파일을 두고, `AppProviders`와 `BootstrapService`에 연결. `AppError` 하위 클래스는 `userMessage` 하드코딩 대신 `messageKey`로 전환되어 렌더 시점에 `t()`로 해석.

**Tech Stack:** i18next, react-i18next, expo-localization, @react-native-async-storage/async-storage, Intl API (Hermes 내장)

**Spec:** `docs/superpowers/specs/2026-04-13-i18n-design.md` (§ 9.1 Phase 1~3 범위)

**이 플랜 범위 밖(후속 플랜)**: 화면별 하드코딩 문자열 전환, `bundle_translations` / `deck_translations` 테이블, `Deck.sourceLanguage` / `targetLanguage` 필드, 설정 화면의 언어 선택 UI.

---

## File Structure

**신규 생성:**
- `src/shared/i18n/config.ts` — 지원 로케일 상수, fallback 체인
- `src/shared/i18n/types.ts` — `LanguageCode`, `TranslationKey` 타입
- `src/shared/i18n/i18nInstance.ts` — i18next 인스턴스 생성·초기화
- `src/shared/i18n/LocaleService.ts` — 감지·영속화·변경
- `src/shared/i18n/LocaleStorage.ts` — AsyncStorage 래퍼 (LocaleService 협력자)
- `src/shared/i18n/LocaleDetector.ts` — expo-localization 래퍼 (LocaleService 협력자)
- `src/shared/i18n/index.ts` — 외부 공개 API
- `src/shared/i18n/hooks/useT.ts`
- `src/shared/i18n/hooks/useFormat.ts`
- `src/shared/i18n/format/dateFormat.ts`
- `src/shared/i18n/format/numberFormat.ts`
- `src/shared/i18n/format/relativeTimeFormat.ts`
- `src/shared/i18n/locales/ko.json`
- `src/shared/i18n/locales/en.json`
- `src/shared/i18n/locales/ja.json`
- `src/shared/i18n/locales/zh.json`
- `__tests__/i18n/LocaleService.test.ts`
- `__tests__/i18n/format/dateFormat.test.ts`
- `__tests__/i18n/format/numberFormat.test.ts`
- `__tests__/i18n/format/relativeTimeFormat.test.ts`
- `__tests__/i18n/localeStructure.test.ts`
- `__tests__/helpers/i18nTestSetup.ts` — 테스트 환경에서 i18next 초기화 헬퍼

**수정:**
- `src/core/errors/AppError.ts` — `messageKey`, `messageParams` 추가, `userMessage`를 getter로
- `src/core/errors/DatabaseError.ts` — 각 서브클래스에 `messageKey` 부여
- `src/core/errors/NetworkError.ts` — 동일
- `src/core/errors/UnknownError.ts` — 동일
- `src/core/errors/handleError.ts` — `toast.show` 시 `t(messageKey)` 사용
- `src/app/bootstrap/AppBootstrapGate.tsx` — `t(error.messageKey)` 호출
- `src/app/AppProviders.tsx` — `I18nextProvider` 추가
- `src/core/services/BootstrapService.ts` — i18n 초기화 단계 추가
- `src/core/services/createAppServices.ts` — `LocaleService` 조립
- `__tests__/errors/AppError.test.ts` — `messageKey` 기반 assertion + i18nTestSetup 적용
- `__tests__/errors/handleError.test.ts` — i18nTestSetup 적용
- `package.json` — 의존성 추가

---

## Task 1: 의존성 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 의존성 설치**

```bash
npx expo install i18next react-i18next expo-localization @react-native-async-storage/async-storage
```

Expo의 `install` 명령은 SDK와 호환되는 버전을 고르므로 `npm install` 대신 사용.

- [ ] **Step 2: 설치 확인**

```bash
node -e "['i18next','react-i18next','expo-localization','@react-native-async-storage/async-storage'].forEach(p => require.resolve(p))"
```
Expected: 에러 없이 종료

- [ ] **Step 3: typecheck로 설치물 건전성 확인**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add i18n dependencies (i18next, react-i18next, expo-localization, async-storage)"
```

---

## Task 2: 지원 로케일 상수와 타입 정의

**Files:**
- Create: `src/shared/i18n/config.ts`
- Create: `src/shared/i18n/types.ts`

- [ ] **Step 1: `config.ts` 작성**

```ts
// src/shared/i18n/config.ts
export const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh"] as const;
export const DEFAULT_LOCALE = "en" as const;
export const FALLBACK_CHAIN = ["en", "ko"] as const;

export type LanguageCode = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string | null | undefined): value is LanguageCode {
  return value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: `types.ts` 작성 (TranslationKey 스캐폴드)**

```ts
// src/shared/i18n/types.ts
import ko from "@/src/shared/i18n/locales/ko.json";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? Leaves<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

export type TranslationKey = Leaves<typeof ko>;
```

이 타입은 `ko.json`을 진실 원본으로 삼아 중첩 키를 점 표기 문자열 유니온으로 생성한다 (`common.save`, `errors.network` 등).

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: `Cannot find module './locales/ko.json'` — Task 3에서 파일을 만들면 해결됨. 지금은 예상되는 실패.

- [ ] **Step 4: Commit**

```bash
git add src/shared/i18n/config.ts src/shared/i18n/types.ts
git commit -m "feat(i18n): add locale constants and TranslationKey type scaffold"
```

---

## Task 3: 로케일 파일 스켈레톤 생성

**Files:**
- Create: `src/shared/i18n/locales/ko.json`
- Create: `src/shared/i18n/locales/en.json`
- Create: `src/shared/i18n/locales/ja.json`
- Create: `src/shared/i18n/locales/zh.json`

- [ ] **Step 1: `ko.json` 작성 (진실 원본)**

```json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "retry": "다시 시도",
    "confirm": "확인",
    "close": "닫기"
  },
  "errors": {
    "deckSave": "덱 저장에 실패했습니다.",
    "deckDelete": "덱 삭제에 실패했습니다.",
    "deckNotFound": "덱을 찾을 수 없습니다.",
    "studyRecord": "학습 기록 저장에 실패했습니다.",
    "bootstrap": "앱 초기화에 실패했습니다.",
    "bundleQuery": "번들 정보를 불러올 수 없습니다.",
    "entitlementCache": "구매 캐시 처리에 실패했습니다.",
    "sync": "동기화에 실패했습니다.",
    "entitlementFetch": "구매 정보를 불러올 수 없습니다.",
    "unknown": "알 수 없는 오류가 발생했습니다."
  }
}
```

- [ ] **Step 2: `en.json` 작성**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "retry": "Retry",
    "confirm": "Confirm",
    "close": "Close"
  },
  "errors": {
    "deckSave": "Failed to save deck.",
    "deckDelete": "Failed to delete deck.",
    "deckNotFound": "Deck not found.",
    "studyRecord": "Failed to save study record.",
    "bootstrap": "Failed to initialize the app.",
    "bundleQuery": "Failed to load bundle.",
    "entitlementCache": "Failed to process entitlement cache.",
    "sync": "Sync failed.",
    "entitlementFetch": "Failed to load entitlements.",
    "unknown": "An unknown error occurred."
  }
}
```

- [ ] **Step 3: `ja.json` 작성**

```json
{
  "common": {
    "save": "保存",
    "cancel": "キャンセル",
    "retry": "再試行",
    "confirm": "確認",
    "close": "閉じる"
  },
  "errors": {
    "deckSave": "デッキの保存に失敗しました。",
    "deckDelete": "デッキの削除に失敗しました。",
    "deckNotFound": "デッキが見つかりません。",
    "studyRecord": "学習記録の保存に失敗しました。",
    "bootstrap": "アプリの初期化に失敗しました。",
    "bundleQuery": "バンドル情報を読み込めませんでした。",
    "entitlementCache": "購入キャッシュの処理に失敗しました。",
    "sync": "同期に失敗しました。",
    "entitlementFetch": "購入情報を読み込めませんでした。",
    "unknown": "不明なエラーが発生しました。"
  }
}
```

- [ ] **Step 4: `zh.json` 작성**

```json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "retry": "重试",
    "confirm": "确认",
    "close": "关闭"
  },
  "errors": {
    "deckSave": "保存卡组失败。",
    "deckDelete": "删除卡组失败。",
    "deckNotFound": "未找到卡组。",
    "studyRecord": "保存学习记录失败。",
    "bootstrap": "应用初始化失败。",
    "bundleQuery": "无法加载套装信息。",
    "entitlementCache": "处理购买缓存失败。",
    "sync": "同步失败。",
    "entitlementFetch": "无法加载购买信息。",
    "unknown": "发生未知错误。"
  }
}
```

- [ ] **Step 5: typecheck — TranslationKey가 해석되어야 함**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/shared/i18n/locales
git commit -m "feat(i18n): add locale files for common and errors namespaces (ko/en/ja/zh)"
```

---

## Task 4: 로케일 파일 구조 검증 테스트

**Files:**
- Create: `__tests__/i18n/localeStructure.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// __tests__/i18n/localeStructure.test.ts
import ko from "@/src/shared/i18n/locales/ko.json";
import en from "@/src/shared/i18n/locales/en.json";
import ja from "@/src/shared/i18n/locales/ja.json";
import zh from "@/src/shared/i18n/locales/zh.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("locale file structure", () => {
  const koKeys = flattenKeys(ko);
  const locales = { en, ja, zh };

  it("ko.json is non-empty", () => {
    expect(koKeys.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(locales))(
    "%s.json has no extra keys beyond ko.json",
    (_name, data) => {
      const keys = flattenKeys(data as Record<string, unknown>);
      const extra = keys.filter((k) => !koKeys.includes(k));
      expect(extra).toEqual([]);
    },
  );

  it.each(Object.entries(locales))(
    "%s.json missing-key report (warning only)",
    (name, data) => {
      const keys = flattenKeys(data as Record<string, unknown>);
      const missing = koKeys.filter((k) => !keys.includes(k));
      if (missing.length > 0) {
        console.warn(`[${name}] missing keys:`, missing);
      }
      expect(true).toBe(true);
    },
  );
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx jest __tests__/i18n/localeStructure.test.ts
```
Expected: 모든 "no extra keys" 케이스 PASS. missing-key 경고 없음 (현재는 모든 파일이 동일 키 집합).

- [ ] **Step 3: Commit**

```bash
git add __tests__/i18n/localeStructure.test.ts
git commit -m "test(i18n): verify locale file structure consistency"
```

---

## Task 5: LocaleStorage + LocaleDetector (협력자) 작성

**Files:**
- Create: `src/shared/i18n/LocaleStorage.ts`
- Create: `src/shared/i18n/LocaleDetector.ts`

- [ ] **Step 1: `LocaleStorage.ts` 작성**

```ts
// src/shared/i18n/LocaleStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocaleStorage {
  getStoredLocale(): Promise<string | null>;
  setStoredLocale(locale: string): Promise<void>;
}

const STORAGE_KEY = "flash-voca.locale";

export class AsyncStorageLocaleStorage implements LocaleStorage {
  async getStoredLocale(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEY);
  }
  async setStoredLocale(locale: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  }
}
```

- [ ] **Step 2: `LocaleDetector.ts` 작성**

```ts
// src/shared/i18n/LocaleDetector.ts
import * as Localization from "expo-localization";

export interface LocaleDetector {
  detectDeviceLocale(): string | null;
}

export class ExpoLocaleDetector implements LocaleDetector {
  detectDeviceLocale(): string | null {
    const locales = Localization.getLocales();
    return locales[0]?.languageCode ?? null;
  }
}
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/shared/i18n/LocaleStorage.ts src/shared/i18n/LocaleDetector.ts
git commit -m "feat(i18n): add LocaleStorage and LocaleDetector collaborator interfaces"
```

---

## Task 6: LocaleService 테스트 작성 (실패 상태)

**Files:**
- Create: `__tests__/i18n/LocaleService.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// __tests__/i18n/LocaleService.test.ts
import { LocaleService } from "@/src/shared/i18n/LocaleService";
import type { LocaleStorage } from "@/src/shared/i18n/LocaleStorage";
import type { LocaleDetector } from "@/src/shared/i18n/LocaleDetector";

function createMockStorage(initial: string | null = null): LocaleStorage & { stored: string | null } {
  const state = { stored: initial };
  return {
    get stored() {
      return state.stored;
    },
    set stored(v) {
      state.stored = v;
    },
    async getStoredLocale() {
      return state.stored;
    },
    async setStoredLocale(locale) {
      state.stored = locale;
    },
  };
}

function createMockDetector(deviceLocale: string | null): LocaleDetector {
  return { detectDeviceLocale: () => deviceLocale };
}

describe("LocaleService.resolveInitialLocale", () => {
  it("returns stored locale when present and supported", async () => {
    const service = new LocaleService(createMockStorage("ja"), createMockDetector("en"));
    expect(await service.resolveInitialLocale()).toBe("ja");
  });

  it("falls back to device locale when no stored value", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("zh"));
    expect(await service.resolveInitialLocale()).toBe("zh");
  });

  it("falls back to default when device locale is unsupported", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("fr"));
    expect(await service.resolveInitialLocale()).toBe("en");
  });

  it("falls back to default when device locale is null", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector(null));
    expect(await service.resolveInitialLocale()).toBe("en");
  });

  it("ignores stored locale when unsupported and falls through to device", async () => {
    const service = new LocaleService(createMockStorage("fr"), createMockDetector("ko"));
    expect(await service.resolveInitialLocale()).toBe("ko");
  });
});

describe("LocaleService.setLocale", () => {
  it("persists supported locale and notifies subscribers", async () => {
    const storage = createMockStorage(null);
    const service = new LocaleService(storage, createMockDetector("en"));
    const received: string[] = [];
    service.subscribe((l) => received.push(l));

    await service.setLocale("ja");

    expect(storage.stored).toBe("ja");
    expect(received).toEqual(["ja"]);
  });

  it("rejects unsupported locale", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("en"));
    await expect(service.setLocale("fr")).rejects.toThrow(/unsupported locale/i);
  });

  it("unsubscribe stops further notifications", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("en"));
    const received: string[] = [];
    const unsubscribe = service.subscribe((l) => received.push(l));

    await service.setLocale("ja");
    unsubscribe();
    await service.setLocale("zh");

    expect(received).toEqual(["ja"]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
npx jest __tests__/i18n/LocaleService.test.ts
```
Expected: FAIL — `Cannot find module '@/src/shared/i18n/LocaleService'`

---

## Task 7: LocaleService 구현

**Files:**
- Create: `src/shared/i18n/LocaleService.ts`

- [ ] **Step 1: 구현 작성**

```ts
// src/shared/i18n/LocaleService.ts
import {
  DEFAULT_LOCALE,
  LanguageCode,
  isSupportedLocale,
} from "@/src/shared/i18n/config";
import type { LocaleDetector } from "@/src/shared/i18n/LocaleDetector";
import type { LocaleStorage } from "@/src/shared/i18n/LocaleStorage";

type LocaleListener = (locale: LanguageCode) => void;

export class LocaleService {
  private listeners: Set<LocaleListener> = new Set();

  constructor(
    private readonly storage: LocaleStorage,
    private readonly detector: LocaleDetector,
  ) {}

  async resolveInitialLocale(): Promise<LanguageCode> {
    const stored = await this.storage.getStoredLocale();
    if (isSupportedLocale(stored)) {
      return stored;
    }
    const device = this.detector.detectDeviceLocale();
    if (isSupportedLocale(device)) {
      return device;
    }
    return DEFAULT_LOCALE;
  }

  async setLocale(locale: string): Promise<void> {
    if (!isSupportedLocale(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }
    await this.storage.setStoredLocale(locale);
    this.listeners.forEach((listener) => listener(locale));
  }

  subscribe(listener: LocaleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
```

- [ ] **Step 2: 테스트 실행**

```bash
npx jest __tests__/i18n/LocaleService.test.ts
```
Expected: 모두 PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/LocaleService.ts __tests__/i18n/LocaleService.test.ts
git commit -m "feat(i18n): implement LocaleService with storage and detection"
```

---

## Task 8: i18next 인스턴스 모듈

**Files:**
- Create: `src/shared/i18n/i18nInstance.ts`

- [ ] **Step 1: 구현 작성**

```ts
// src/shared/i18n/i18nInstance.ts
import i18next, { i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { FALLBACK_CHAIN, LanguageCode, SUPPORTED_LOCALES } from "@/src/shared/i18n/config";
import en from "@/src/shared/i18n/locales/en.json";
import ja from "@/src/shared/i18n/locales/ja.json";
import ko from "@/src/shared/i18n/locales/ko.json";
import zh from "@/src/shared/i18n/locales/zh.json";

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
} as const;

export async function initI18next(initialLocale: LanguageCode): Promise<I18nInstance> {
  if (i18next.isInitialized) {
    if (i18next.language !== initialLocale) {
      await i18next.changeLanguage(initialLocale);
    }
    return i18next;
  }

  await i18next.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: [...FALLBACK_CHAIN],
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return i18next;
}

export { i18next };
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/i18nInstance.ts
git commit -m "feat(i18n): add i18next instance initialization with all locale resources"
```

---

## Task 9: useT 훅

**Files:**
- Create: `src/shared/i18n/hooks/useT.ts`

- [ ] **Step 1: 구현 작성**

```ts
// src/shared/i18n/hooks/useT.ts
import { useTranslation } from "react-i18next";

import type { LanguageCode } from "@/src/shared/i18n/config";
import type { TranslationKey } from "@/src/shared/i18n/types";

type InterpolationValues = Record<string, string | number>;

export function useT() {
  const { t, i18n } = useTranslation();

  return {
    t: (key: TranslationKey, values?: InterpolationValues): string =>
      t(key, values ?? {}) as string,
    locale: i18n.language as LanguageCode,
  };
}
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/hooks/useT.ts
git commit -m "feat(i18n): add typed useT hook wrapping react-i18next"
```

---

## Task 10: 포맷 유틸 테스트 (date)

**Files:**
- Create: `__tests__/i18n/format/dateFormat.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// __tests__/i18n/format/dateFormat.test.ts
import { formatDate } from "@/src/shared/i18n/format/dateFormat";

describe("formatDate", () => {
  const iso = "2026-04-13T09:30:00Z";

  it("formats ko locale (medium)", () => {
    const output = formatDate(iso, "ko", "medium");
    expect(output).toMatch(/2026/);
  });

  it("formats en locale (short)", () => {
    const output = formatDate(iso, "en", "short");
    expect(output).toMatch(/26|2026/);
  });

  it("accepts Date objects", () => {
    const output = formatDate(new Date(iso), "ja", "medium");
    expect(output).toMatch(/2026/);
  });

  it("defaults to medium style when not provided", () => {
    const output = formatDate(iso, "zh");
    expect(output).toMatch(/2026/);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/i18n/format/dateFormat.test.ts
```
Expected: FAIL — `Cannot find module`

---

## Task 11: dateFormat 구현

**Files:**
- Create: `src/shared/i18n/format/dateFormat.ts`

- [ ] **Step 1: 구현 작성**

```ts
// src/shared/i18n/format/dateFormat.ts
import type { LanguageCode } from "@/src/shared/i18n/config";

type DateStyle = "short" | "medium" | "long";

const cache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: LanguageCode, style: DateStyle): Intl.DateTimeFormat {
  const key = `${locale}:${style}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: style });
    cache.set(key, formatter);
  }
  return formatter;
}

export function clearDateFormatCache(): void {
  cache.clear();
}

export function formatDate(
  value: Date | string,
  locale: LanguageCode,
  style: DateStyle = "medium",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return getFormatter(locale, style).format(date);
}
```

- [ ] **Step 2: 테스트 실행**

```bash
npx jest __tests__/i18n/format/dateFormat.test.ts
```
Expected: 모두 PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/format/dateFormat.ts __tests__/i18n/format/dateFormat.test.ts
git commit -m "feat(i18n): add formatDate with locale-aware Intl.DateTimeFormat cache"
```

---

## Task 12: numberFormat 테스트와 구현

**Files:**
- Create: `__tests__/i18n/format/numberFormat.test.ts`
- Create: `src/shared/i18n/format/numberFormat.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// __tests__/i18n/format/numberFormat.test.ts
import { formatNumber } from "@/src/shared/i18n/format/numberFormat";

describe("formatNumber", () => {
  it("formats with ko thousands separator", () => {
    expect(formatNumber(1234567, "ko")).toBe("1,234,567");
  });
  it("formats with en thousands separator", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });
  it("formats with ja thousands separator", () => {
    expect(formatNumber(1234567, "ja")).toBe("1,234,567");
  });
  it("formats with zh thousands separator", () => {
    expect(formatNumber(1234567, "zh")).toBe("1,234,567");
  });
  it("handles decimal numbers", () => {
    expect(formatNumber(3.14, "en")).toBe("3.14");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/i18n/format/numberFormat.test.ts
```
Expected: FAIL

- [ ] **Step 3: 구현 작성**

```ts
// src/shared/i18n/format/numberFormat.ts
import type { LanguageCode } from "@/src/shared/i18n/config";

const cache = new Map<LanguageCode, Intl.NumberFormat>();

function getFormatter(locale: LanguageCode): Intl.NumberFormat {
  let formatter = cache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    cache.set(locale, formatter);
  }
  return formatter;
}

export function clearNumberFormatCache(): void {
  cache.clear();
}

export function formatNumber(value: number, locale: LanguageCode): string {
  return getFormatter(locale).format(value);
}
```

- [ ] **Step 4: 테스트 실행**

```bash
npx jest __tests__/i18n/format/numberFormat.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/i18n/format/numberFormat.ts __tests__/i18n/format/numberFormat.test.ts
git commit -m "feat(i18n): add formatNumber with Intl.NumberFormat cache"
```

---

## Task 13: relativeTimeFormat 테스트와 구현

**Files:**
- Create: `__tests__/i18n/format/relativeTimeFormat.test.ts`
- Create: `src/shared/i18n/format/relativeTimeFormat.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// __tests__/i18n/format/relativeTimeFormat.test.ts
import { formatRelativeTime } from "@/src/shared/i18n/format/relativeTimeFormat";

const now = new Date("2026-04-13T12:00:00Z");

describe("formatRelativeTime", () => {
  it("returns a past expression for 3 days ago in ko", () => {
    const past = new Date("2026-04-10T12:00:00Z").toISOString();
    const output = formatRelativeTime(past, "ko", now);
    expect(output).toMatch(/3|전/);
  });

  it("returns a past expression for 2 hours ago in en", () => {
    const past = new Date("2026-04-13T10:00:00Z").toISOString();
    const output = formatRelativeTime(past, "en", now);
    expect(output).toMatch(/2|hour|ago/i);
  });

  it("returns a future expression for 1 day ahead in ja", () => {
    const future = new Date("2026-04-14T12:00:00Z").toISOString();
    const output = formatRelativeTime(future, "ja", now);
    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });

  it("returns non-empty string for zh", () => {
    const past = new Date("2026-04-11T12:00:00Z").toISOString();
    const output = formatRelativeTime(past, "zh", now);
    expect(output.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/i18n/format/relativeTimeFormat.test.ts
```
Expected: FAIL

- [ ] **Step 3: 구현 작성**

```ts
// src/shared/i18n/format/relativeTimeFormat.ts
import type { LanguageCode } from "@/src/shared/i18n/config";

const cache = new Map<LanguageCode, Intl.RelativeTimeFormat>();

function getFormatter(locale: LanguageCode): Intl.RelativeTimeFormat {
  let formatter = cache.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    cache.set(locale, formatter);
  }
  return formatter;
}

export function clearRelativeTimeFormatCache(): void {
  cache.clear();
}

type Unit = Intl.RelativeTimeFormatUnit;

const UNIT_BOUNDS: ReadonlyArray<{ unit: Unit; seconds: number }> = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

export function formatRelativeTime(
  fromIso: string,
  locale: LanguageCode,
  now: Date = new Date(),
): string {
  const from = new Date(fromIso);
  const diffSec = Math.round((from.getTime() - now.getTime()) / 1000);
  const absSec = Math.abs(diffSec);

  for (const { unit, seconds } of UNIT_BOUNDS) {
    if (absSec >= seconds || unit === "second") {
      const value = Math.round(diffSec / seconds);
      return getFormatter(locale).format(value, unit);
    }
  }

  return getFormatter(locale).format(0, "second");
}
```

- [ ] **Step 4: 테스트 실행**

```bash
npx jest __tests__/i18n/format/relativeTimeFormat.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/i18n/format/relativeTimeFormat.ts __tests__/i18n/format/relativeTimeFormat.test.ts
git commit -m "feat(i18n): add formatRelativeTime with unit bucketing and cache"
```

---

## Task 14: useFormat 훅

**Files:**
- Create: `src/shared/i18n/hooks/useFormat.ts`

- [ ] **Step 1: 구현 작성**

```ts
// src/shared/i18n/hooks/useFormat.ts
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { LanguageCode } from "@/src/shared/i18n/config";
import { formatDate } from "@/src/shared/i18n/format/dateFormat";
import { formatNumber } from "@/src/shared/i18n/format/numberFormat";
import { formatRelativeTime } from "@/src/shared/i18n/format/relativeTimeFormat";

type DateStyle = "short" | "medium" | "long";

export function useFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language as LanguageCode;

  return useMemo(
    () => ({
      date: (value: Date | string, style?: DateStyle) => formatDate(value, locale, style),
      number: (value: number) => formatNumber(value, locale),
      relative: (fromIso: string, now?: Date) => formatRelativeTime(fromIso, locale, now),
    }),
    [locale],
  );
}
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/hooks/useFormat.ts
git commit -m "feat(i18n): add useFormat hook aggregating date/number/relative formatters"
```

---

## Task 15: i18n 외부 공개 API

**Files:**
- Create: `src/shared/i18n/index.ts`

- [ ] **Step 1: 작성**

```ts
// src/shared/i18n/index.ts
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_CHAIN,
  isSupportedLocale,
} from "@/src/shared/i18n/config";
export type { LanguageCode } from "@/src/shared/i18n/config";
export type { TranslationKey } from "@/src/shared/i18n/types";
export { LocaleService } from "@/src/shared/i18n/LocaleService";
export { AsyncStorageLocaleStorage } from "@/src/shared/i18n/LocaleStorage";
export type { LocaleStorage } from "@/src/shared/i18n/LocaleStorage";
export { ExpoLocaleDetector } from "@/src/shared/i18n/LocaleDetector";
export type { LocaleDetector } from "@/src/shared/i18n/LocaleDetector";
export { initI18next, i18next } from "@/src/shared/i18n/i18nInstance";
export { useT } from "@/src/shared/i18n/hooks/useT";
export { useFormat } from "@/src/shared/i18n/hooks/useFormat";
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/index.ts
git commit -m "feat(i18n): add public barrel export for i18n module"
```

---

## Task 16: i18nTestSetup 헬퍼

**Files:**
- Create: `__tests__/helpers/i18nTestSetup.ts`

- [ ] **Step 1: 작성**

```ts
// __tests__/helpers/i18nTestSetup.ts
import { initI18next, i18next } from "@/src/shared/i18n";
import type { LanguageCode } from "@/src/shared/i18n";

export async function setupI18nForTest(locale: LanguageCode = "ko"): Promise<void> {
  await initI18next(locale);
  if (i18next.language !== locale) {
    await i18next.changeLanguage(locale);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add __tests__/helpers/i18nTestSetup.ts
git commit -m "test(i18n): add i18nTestSetup helper for initializing i18next in jest"
```

---

## Task 17: AppError에 messageKey 도입

**Files:**
- Modify: `src/core/errors/AppError.ts`

- [ ] **Step 1: 수정**

파일 전체를 다음으로 교체:

```ts
// src/core/errors/AppError.ts
import { i18next } from "@/src/shared/i18n";
import type { TranslationKey } from "@/src/shared/i18n";

export type AppErrorOptions = {
  context?: Record<string, unknown>;
  cause?: unknown;
  messageParams?: Record<string, string | number>;
};

export abstract class AppError extends Error {
  abstract readonly category: string;
  abstract readonly messageKey: TranslationKey;
  readonly messageParams?: Record<string, string | number>;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.context = options?.context;
    this.messageParams = options?.messageParams;
    this.timestamp = new Date().toISOString();
  }

  get userMessage(): string {
    return i18next.t(this.messageKey, this.messageParams ?? {}) as string;
  }
}
```

`messageKey`는 추상 속성으로, `userMessage`는 getter로 i18next에서 해석한다.

- [ ] **Step 2: typecheck는 이 시점에서 서브클래스 에러 예상됨 — 다음 태스크로 진행**

---

## Task 18: DatabaseError 서브클래스를 messageKey로 전환

**Files:**
- Modify: `src/core/errors/DatabaseError.ts`

- [ ] **Step 1: 파일 전체 교체**

```ts
// src/core/errors/DatabaseError.ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n";

export abstract class DatabaseError extends AppError {
  readonly category = "database";
}

export class DeckSaveError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.deckSave";
  constructor(options?: AppErrorOptions) {
    super("Deck save failed", options);
  }
}

export class DeckDeleteError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.deckDelete";
  constructor(options?: AppErrorOptions) {
    super("Deck delete failed", options);
  }
}

export class DeckNotFoundError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.deckNotFound";
  constructor(options?: AppErrorOptions) {
    super("Deck not found", options);
  }
}

export class StudyRecordError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.studyRecord";
  constructor(options?: AppErrorOptions) {
    super("Study record save failed", options);
  }
}

export class BootstrapError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.bootstrap";
  constructor(options?: AppErrorOptions) {
    super("App bootstrap failed", options);
  }
}

export class BundleQueryError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.bundleQuery";
  constructor(options?: AppErrorOptions) {
    super("Bundle query failed", options);
  }
}

export class EntitlementCacheError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.entitlementCache";
  constructor(options?: AppErrorOptions) {
    super("Entitlement cache operation failed", options);
  }
}
```

---

## Task 19: NetworkError와 UnknownError 전환

**Files:**
- Modify: `src/core/errors/NetworkError.ts`
- Modify: `src/core/errors/UnknownError.ts`

- [ ] **Step 1: `NetworkError.ts` 전체 교체**

```ts
// src/core/errors/NetworkError.ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n";

export abstract class NetworkError extends AppError {
  readonly category = "network";
}

export class SyncError extends NetworkError {
  readonly messageKey: TranslationKey = "errors.sync";
  constructor(options?: AppErrorOptions) {
    super("Sync failed", options);
  }
}

export class EntitlementFetchError extends NetworkError {
  readonly messageKey: TranslationKey = "errors.entitlementFetch";
  constructor(options?: AppErrorOptions) {
    super("Entitlement fetch failed", options);
  }
}
```

- [ ] **Step 2: `UnknownError.ts` 전체 교체**

```ts
// src/core/errors/UnknownError.ts
import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n";

export class UnknownError extends AppError {
  readonly category = "unknown";
  readonly messageKey: TranslationKey = "errors.unknown";
  constructor(options?: AppErrorOptions) {
    super("Unknown error", options);
  }
}
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 4: Commit** (Task 17~19를 한 커밋으로 묶음 — AppError 구조 변경은 원자적)

```bash
git add src/core/errors/AppError.ts src/core/errors/DatabaseError.ts src/core/errors/NetworkError.ts src/core/errors/UnknownError.ts
git commit -m "refactor(errors): replace hardcoded userMessage with messageKey + i18next resolution"
```

---

## Task 20: 에러 테스트를 messageKey 기반으로 갱신

**Files:**
- Modify: `__tests__/errors/AppError.test.ts`

- [ ] **Step 1: 파일 전체 교체**

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
import { setupI18nForTest } from "@/__tests__/helpers/i18nTestSetup";

beforeAll(async () => {
  await setupI18nForTest("ko");
});

describe("Error class hierarchy", () => {
  describe("DeckSaveError", () => {
    it("is an instance of AppError and DatabaseError", () => {
      const error = new DeckSaveError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(DeckSaveError);
      expect(error).toBeInstanceOf(Error);
    });

    it("has correct category, messageKey, userMessage, and name", () => {
      const error = new DeckSaveError();
      expect(error.category).toBe("database");
      expect(error.messageKey).toBe("errors.deckSave");
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
      expect(error.messageKey).toBe("errors.deckDelete");
      expect(error.userMessage).toBe("덱 삭제에 실패했습니다.");
      expect(error.name).toBe("DeckDeleteError");
    });
  });

  describe("DeckNotFoundError", () => {
    it("has correct properties", () => {
      const error = new DeckNotFoundError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.messageKey).toBe("errors.deckNotFound");
      expect(error.userMessage).toBe("덱을 찾을 수 없습니다.");
    });
  });

  describe("StudyRecordError", () => {
    it("has correct properties", () => {
      const error = new StudyRecordError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.messageKey).toBe("errors.studyRecord");
      expect(error.userMessage).toBe("학습 기록 저장에 실패했습니다.");
    });
  });

  describe("BootstrapError", () => {
    it("has correct properties", () => {
      const error = new BootstrapError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.messageKey).toBe("errors.bootstrap");
      expect(error.userMessage).toBe("앱 초기화에 실패했습니다.");
    });
  });

  describe("BundleQueryError", () => {
    it("has correct properties", () => {
      const error = new BundleQueryError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.messageKey).toBe("errors.bundleQuery");
      expect(error.userMessage).toBe("번들 정보를 불러올 수 없습니다.");
    });
  });

  describe("EntitlementCacheError", () => {
    it("has correct properties", () => {
      const error = new EntitlementCacheError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.messageKey).toBe("errors.entitlementCache");
      expect(error.userMessage).toBe("구매 캐시 처리에 실패했습니다.");
    });
  });

  describe("SyncError", () => {
    it("is an instance of NetworkError", () => {
      const error = new SyncError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.category).toBe("network");
      expect(error.messageKey).toBe("errors.sync");
      expect(error.userMessage).toBe("동기화에 실패했습니다.");
    });
  });

  describe("EntitlementFetchError", () => {
    it("has correct properties", () => {
      const error = new EntitlementFetchError();
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.messageKey).toBe("errors.entitlementFetch");
      expect(error.userMessage).toBe("구매 정보를 불러올 수 없습니다.");
    });
  });

  describe("UnknownError", () => {
    it("has correct properties", () => {
      const error = new UnknownError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe("unknown");
      expect(error.messageKey).toBe("errors.unknown");
      expect(error.userMessage).toBe("알 수 없는 오류가 발생했습니다.");
    });

    it("is not an instance of DatabaseError or NetworkError", () => {
      const error = new UnknownError();
      expect(error).not.toBeInstanceOf(DatabaseError);
      expect(error).not.toBeInstanceOf(NetworkError);
    });
  });

  describe("userMessage locale resolution", () => {
    it("changes when i18next language switches", async () => {
      const { i18next } = await import("@/src/shared/i18n");
      const error = new DeckSaveError();

      await i18next.changeLanguage("en");
      expect(error.userMessage).toBe("Failed to save deck.");

      await i18next.changeLanguage("ja");
      expect(error.userMessage).toBe("デッキの保存に失敗しました。");

      await i18next.changeLanguage("ko");
      expect(error.userMessage).toBe("덱 저장에 실패했습니다.");
    });
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx jest __tests__/errors/AppError.test.ts
```
Expected: 모두 PASS (기존 한국어 assertion은 ko locale로 유지, 새 로케일 전환 테스트 추가)

- [ ] **Step 3: Commit**

```bash
git add __tests__/errors/AppError.test.ts
git commit -m "test(errors): update AppError tests to cover messageKey and locale switching"
```

---

## Task 21: handleError 테스트 갱신

**Files:**
- Modify: `__tests__/errors/handleError.test.ts`

- [ ] **Step 1: 파일 전체 교체**

기존 테스트는 `toast.show`에 전달된 한국어 메시지를 직접 검증한다. `userMessage`가 getter로 변경되었으므로 i18next 초기화가 필요하다.

```ts
// __tests__/errors/handleError.test.ts
import { DeckSaveError, UnknownError } from "@/src/core/errors";
import { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";
import { setupI18nForTest } from "@/__tests__/helpers/i18nTestSetup";

beforeAll(async () => {
  await setupI18nForTest("ko");
});

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

유일한 변경: 상단에 `setupI18nForTest` import + `beforeAll`. 나머지는 기존과 동일 — `userMessage` getter가 ko locale에서 같은 문자열을 반환하므로 assertion은 그대로 유효.

- [ ] **Step 2: 테스트 실행**

```bash
npx jest __tests__/errors/handleError.test.ts
```
Expected: 모두 PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/errors/handleError.test.ts
git commit -m "test(errors): initialize i18next for handleError tests"
```

---

## Task 22: BootstrapService에 i18n 초기화 추가

**Files:**
- Modify: `src/core/services/BootstrapService.ts`

- [ ] **Step 1: 파일 전체 교체**

```ts
// src/core/services/BootstrapService.ts
import { BootstrapError } from "@/src/core/errors";
import { initializeDatabaseAsync } from "@/src/core/database/initialize";
import { seedMvpDataAsync } from "@/src/core/database/seed";
import { initI18next, LocaleService } from "@/src/shared/i18n";

export class BootstrapService {
  constructor(private readonly localeService: LocaleService) {}

  async prepareAppAsync() {
    try {
      const initialLocale = await this.localeService.resolveInitialLocale();
      await Promise.all([
        initI18next(initialLocale),
        (async () => {
          await initializeDatabaseAsync();
          await seedMvpDataAsync();
        })(),
      ]);
    } catch (error) {
      if (error instanceof BootstrapError) {
        throw error;
      }
      throw new BootstrapError({ cause: error });
    }
  }
}
```

- [ ] **Step 2: typecheck (createAppServices 쪽에서 에러 예상)**

```bash
npm run typecheck
```
Expected: `BootstrapService` 생성자가 `LocaleService`를 요구해 `createAppServices.ts`에서 에러. 다음 태스크에서 해결.

---

## Task 23: createAppServices에 LocaleService 조립

**Files:**
- Modify: `src/core/services/createAppServices.ts`

- [ ] **Step 1: 파일 전체 교체**

```ts
// src/core/services/createAppServices.ts
import { SqliteBundleRepository } from "@/src/core/repositories/sqlite/SqliteBundleRepository";
import { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { SqliteStudyRepository } from "@/src/core/repositories/sqlite/SqliteStudyRepository";
import { SupabaseEntitlementGateway } from "@/src/core/repositories/supabase/SupabaseEntitlementGateway";
import { BootstrapService } from "@/src/core/services/BootstrapService";
import { DeckService } from "@/src/core/services/DeckService";
import { EntitlementService } from "@/src/core/services/EntitlementService";
import { StoreService } from "@/src/core/services/StoreService";
import { StudySessionService } from "@/src/core/services/StudySessionService";
import { NoopBillingGateway } from "@/src/core/services/billing/NoopBillingGateway";
import {
  AsyncStorageLocaleStorage,
  ExpoLocaleDetector,
  LocaleService,
} from "@/src/shared/i18n";

export function createAppServices() {
  const deckRepository = new SqliteDeckRepository();
  const bundleRepository = new SqliteBundleRepository();
  const entitlementRepository = new SqliteEntitlementRepository();
  const studyRepository = new SqliteStudyRepository();
  const entitlementService = new EntitlementService(
    entitlementRepository,
    new SupabaseEntitlementGateway(),
    new NoopBillingGateway(),
  );
  const localeService = new LocaleService(
    new AsyncStorageLocaleStorage(),
    new ExpoLocaleDetector(),
  );

  return {
    bootstrapService: new BootstrapService(localeService),
    localeService,
    deckService: new DeckService(deckRepository),
    storeService: new StoreService(bundleRepository, entitlementService),
    entitlementService,
    studySessionService: new StudySessionService(deckRepository, studyRepository),
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit (Task 22 + 23 묶음)**

```bash
git add src/core/services/BootstrapService.ts src/core/services/createAppServices.ts
git commit -m "feat(i18n): wire LocaleService into composition root and BootstrapService"
```

---

## Task 24: AppProviders에 I18nextProvider 추가

**Files:**
- Modify: `src/app/AppProviders.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
// src/app/AppProviders.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createErrorHandler } from "@/src/core/errors/handleError";
import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { i18next } from "@/src/shared/i18n";
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
        <I18nextProvider i18n={i18next}>
          <ThemeProvider>
            <ToastProvider>
              <AppServicesContext.Provider value={services}>
                <QueryLayer>{children}</QueryLayer>
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

  if (!services) {
    throw new Error("AppServicesContext is not available.");
  }

  return services;
}
```

`I18nextProvider`는 외곽에 배치 — `I18nextProvider`가 i18next 인스턴스를 React 컨텍스트로 제공하여 `useTranslation()`을 모든 하위에서 사용 가능. `BootstrapService`가 `initI18next`로 초기화하면 같은 싱글톤 인스턴스가 즉시 활성화되므로 Provider 자체는 `AppBootstrapGate` 위에 있어도 안전하다.

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/app/AppProviders.tsx
git commit -m "feat(i18n): wrap app tree with I18nextProvider"
```

---

## Task 25: AppBootstrapGate가 messageKey 사용하도록 갱신

**Files:**
- Modify: `src/app/bootstrap/AppBootstrapGate.tsx`

- [ ] **Step 1: 수정**

29~37번 줄의 error 블록을 수정. `error.userMessage`는 getter라 이미 동작하지만, 명시적으로 i18next 사용을 드러내기 위해 `useT` 도입.

파일 전체 교체:

```tsx
// src/app/bootstrap/AppBootstrapGate.tsx
import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { AppError } from "@/src/core/errors";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService } = useAppServices();
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
        if (isMounted) {
          setState("ready");
        }
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

    return () => {
      isMounted = false;
    };
  }, [bootstrapService, t]);

  if (state === "ready") {
    return children;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Flash Voca</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {state === "error" ? "Startup issue" : "Preparing local-first workspace"}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          {state === "error"
            ? errorMessage
            : "SQLite schema, sample data, and service boundaries are loading."}
        </Text>
        {state !== "error" ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : null}
      </View>
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
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    gap: tokens.spacing.s,
  },
  eyebrow: {
    ...tokens.typography.label,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    ...tokens.typography.hero,
  },
  message: {
    ...tokens.typography.body,
  },
  loader: {
    marginTop: tokens.spacing.s,
  },
});
```

주의: "Startup issue" / "Preparing local-first workspace" / SQLite 설명 문자열은 본 플랜에서 **일부러 하드코딩 유지**. 이 플랜은 `common` + `errors`만 i18n 전환하는 범위이고, Bootstrap UI 문자열은 후속 플랜(화면별 마이그레이션) 시점에 처리. ESLint 규칙 opt-in 시 이 파일은 아직 제외.

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/app/bootstrap/AppBootstrapGate.tsx
git commit -m "refactor(bootstrap): use t(messageKey) for AppError display in bootstrap gate"
```

---

## Task 26: 전체 검증

**Files:** 없음 — 검증 단계

- [ ] **Step 1: typecheck**

```bash
npm run typecheck
```
Expected: 0 errors

- [ ] **Step 2: lint**

```bash
npm run lint
```
Expected: 0 errors (경고만 있어도 OK)

- [ ] **Step 3: 전체 테스트**

```bash
npm test
```
Expected: 모든 테스트 PASS. 특히:
- `__tests__/i18n/**` — 신규 테스트 모두 통과
- `__tests__/errors/AppError.test.ts` — 업데이트된 messageKey 테스트 통과
- `__tests__/errors/handleError.test.ts` — i18n setup으로 기존 테스트 유지
- `__tests__/services/StudySessionService.test.ts` — 기존 테스트 유지

- [ ] **Step 4: 앱 스모크 테스트 (수동)**

```bash
npx expo start
```

Android 기기/에뮬레이터에서 앱 실행:
- [ ] 부트스트랩이 성공하고 홈 화면 진입 (기존과 동일)
- [ ] 앱 UI 한국어 그대로 (가시 변화 없음)
- [ ] 강제 에러 상황(예: 네트워크 차단)에서 토스트/에러 UI가 기존과 동일한 한국어 메시지 표시

만약 스모크 테스트 실패 시: AsyncStorage / expo-localization 네이티브 모듈 연결 문제일 가능성이 높음. `npx expo prebuild --clean` 후 재빌드 고려.

- [ ] **Step 5: 최종 검증 완료 확인**

문제 없으면 본 플랜 완료. 별도 커밋 없음 (검증 단계).

---

## 검증 체크리스트 요약

| 항목 | 확인 방법 |
|---|---|
| 의존성 설치 | `npm run typecheck` 통과 |
| 로케일 파일 4개 동기화 | `localeStructure.test.ts` PASS |
| LocaleService 동작 | `LocaleService.test.ts` PASS |
| 포맷 유틸 | 3개 format 테스트 PASS |
| AppError 전환 | `AppError.test.ts` PASS + 로케일 전환 테스트 |
| i18n 인프라 연결 | `npm test` 전체 + 수동 스모크 |
| 가시 변화 없음 | 수동 스모크에서 기존 UI 동일 |

---

## 후속 플랜 훅 (구현하지 않음)

이 플랜 완료 후 작성할 후속 플랜:

1. **화면별 한국어 하드코딩 전환** — `profile` → `settings` → `home` → `decks` → `store` → `study`. 각 화면마다 keys를 `ko.json`에 추가하고 `useT()` 적용.
2. **공식 번들/덱 메타 번역 스키마** — `bundle_translations` / `deck_translations` 테이블 생성, Repository 시그니처에 `locale` 추가, seed 확장.
3. **Deck 언어 쌍 필드** — `source_language` / `target_language` 컬럼 추가, 덱 편집기 UI.
4. **설정 화면 언어 선택 UI** — `LocaleService.setLocale`을 호출하는 드롭다운, 변경 시 TanStack Query 무효화 검증.
