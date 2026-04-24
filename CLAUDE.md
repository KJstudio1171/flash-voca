# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install            # install dependencies
npx expo start         # start Expo dev server
npx expo run:android   # build and run on Android
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint (eslint)
npm test               # jest 전체 실행
npm run test:watch     # jest watch 모드
npx jest path/to/test  # 단일 테스트 파일 실행
```

## Architecture

Android-first flashcard vocabulary app: Expo 54 + React Native + TypeScript + Expo Router + expo-sqlite + Supabase + TanStack Query.

### Data flow

Screens never call SQLite or Supabase directly. The layering is strict:

```
Screen → TanStack Query hook → Service → Repository → SQLite / Supabase
```

- **Composition root**: `src/core/services/createAppServices.ts` wires all repositories and services.
- **DI delivery**: `src/app/AppProviders.tsx` exposes services via `useAppServices()` context hook. TanStack Query and gesture handler are also provided here.
- **Bootstrap**: `AppBootstrapGate` initializes the DB, observability, and global handlers before rendering the app tree.

### Path aliases

`@/*` maps to the project root (configured in `tsconfig.json`). Use `@/src/...` for source imports.

### Foundation modules

Three cross-cutting systems. New features must use these rather than reinvent them.

**Errors** — `src/core/errors/`
- Extend `AppError` (never throw raw `Error`). Each subclass declares `category` and `messageKey: TranslationKey`.
- Service/repo layer throws typed errors (e.g. `DeckSaveError`, `BundleQueryError`). Add new subclasses in `DatabaseError.ts` / `NetworkError.ts` when a new failure mode appears — do not reuse generic ones.
- Boundary handling: `createErrorHandler(toast, reporter)` returns a `handleError(unknown)` that normalizes, reports, and toasts. Use at UI/query boundaries, not deep inside services.
- `logger` is dev-only (`__DEV__`) and emits JSON. Do not use `console.*` directly.

**Observability** — `src/core/observability/`
- Initialized once in `AppBootstrapGate` via `initializeObservability({ errorSink, analyticsSink, getLocale })`. Accessors (`getErrorReporter`, `getAnalytics`) throw if called before init.
- **Analytics**: use `trackSafely(name, props)` — it is a no-op before init, safe to call from anywhere. Every event MUST be pre-registered in `observability/eventRegistry.ts` with its `allowedProps`; unregistered events fail typecheck. Scrubbing applies via `scrub.ts`.
- **Error reporter**: `ErrorReporter` gated by `ConsentStore`, enriched with install ID / app version / platform / locale / session ID, and attaches recent breadcrumbs. Global JS and unhandled-promise errors are captured by `installGlobalErrorHandler` in bootstrap.
- **ErrorBoundary**: `ObservabilityErrorBoundary` wraps the app tree; new top-level screens inherit it automatically.
- Sinks are swappable (`ConsoleErrorSink`, `NoopErrorSink`, future remote sinks). Do not hardcode sink choice outside bootstrap.

**i18n** — `src/shared/i18n/`
- All user-facing strings go through `useT()` (hook) or `i18next.t()` (outside React). No hardcoded English.
- Translations live in `locales/{en,ko,ja,zh}.json` and are type-checked as `TranslationKey`. Adding copy = add the key to all four files.
- `AppError.messageKey` uses the same `TranslationKey` type; toast/boundary code calls `i18next.t(error.messageKey, error.messageParams)` to render.
- `LocaleService` resolves: stored preference → device locale → `DEFAULT_LOCALE`. Inject `LocaleStorage` and `LocaleDetector` — do not read AsyncStorage / expo-localization directly.
- Formatting helpers in `format/` (`dateFormat`, `numberFormat`, `relativeTimeFormat`) + `useFormat` hook. Do not call `Intl.*` directly from components.

### Bootstrap order

Order matters — singletons throw if accessed before init. Current sequence in `AppBootstrapGate`:

1. `bootstrapService.prepareAppAsync()` — SQLite schema + seed + locale hydration
2. `initializeObservability(...)` — install ID, consent, breadcrumbs, enricher, sinks
3. `installGlobalErrorHandler(getErrorReporter())` — captures unhandled JS/promise errors
4. `trackSafely("app_opened")`
5. Mount `ObservabilityErrorBoundary` → `QueryLayer` → app tree

New initialization logic belongs inside `BootstrapService` (for DB/locale) or right after step 2 (for observability-dependent wiring). Do not add `useEffect`-based init in screens.

### Key boundaries

- **Billing**: isolated behind `BillingGateway` interface (`src/core/services/billing/`). Currently `NoopBillingGateway`; designed for future Play Billing / RevenueCat integration.
- **Entitlements**: `EntitlementService` mediates between local cache (`cached_entitlements` table), Supabase gateway, and billing gateway.
- **Sync queue**: `pending_sync_operations` table + `enqueuePendingSyncOperation` helper. Repos enqueue sync ops; actual sync is not yet wired.
- **User identity**: hardcoded as `LOCAL_USER_ID = "local-user"` in `src/core/config/constants.ts`. Auth is not yet implemented.
- **Key-value storage**: `SqliteKeyValueStore` (observability) and `AsyncStorageLocaleStorage` (i18n) are the canonical small-state stores. Do not add a third abstraction — inject one of these.

### Routing

Expo Router file-based routing in `app/`. Tab layout at `app/(tabs)/` with four tabs: home, decks, store, profile. Modal-style stack screens for deck editor, study session, and bundle detail.

## Design system

- Typography: use `tokens.typography.*` spread in StyleSheet — no raw fontSize/fontWeight magic numbers. See `docs/design-system.md` for the full token table and decision flowchart.
- Spacing: use `tokens.layout.*` for semantic spacing (screenPadding, sectionGap, cardPadding, etc.) or `tokens.spacing.*` for the raw scale.
- Colors: use `useTheme().colors.*` — never hardcode hex values.
- Flashcard-specific typography (term, meaning sizes) stays local in `StudyFlashcard.tsx` and is not part of the general token system.

## Engineering rules

- Do not call DB directly from screens — use repository/service layers.
- Keep files small and focused.
- Prefer explicit types over inference for public APIs.
- Avoid large speculative refactors.
- Preserve the `BillingGateway` abstraction for future in-app purchases.
- Never throw raw `Error` from services/repos — extend `AppError` with a typed `category` and `messageKey`.
- Never use `console.log/warn/error` — use `logger` (dev) or the `ErrorReporter` (prod-path).
- Never hardcode user-facing copy — add a key to all four `locales/*.json` and resolve via `useT()` / `t()`.
- Never call `trackSafely` with an unregistered event — add it to `analyticsEventRegistry` first (props are typed from `allowedProps`).
- Do not access `getErrorReporter()` / `getAnalytics()` outside code that runs after `AppBootstrapGate` (i.e. inside the app tree). For pre-bootstrap code, prefer `trackSafely` which no-ops safely.
- When adding a new cross-cutting concern, mirror the foundation pattern: interface + injectable implementation + composition in `createAppServices` or `AppBootstrapGate`. No module-level side effects at import time.

## Testing

- Test files live in `__tests__/`, mirroring the source structure (`services/`, `repositories/`, etc.).
- Mock data: use factory functions in `__tests__/helpers/factories.ts`.
- Mock repositories: use helpers in `__tests__/helpers/mockRepositories.ts`.
- Service tests use interface-based manual mocks. Do not use `jest.mock()`.
- Observability tests: call `resetObservabilityForTests()` between tests to clear singletons. Inject `NoopErrorSink` / `NoopAnalyticsSink` to avoid noisy output.
- i18n tests: call `initI18next()` before asserting on `AppError.userMessage` or any `t(...)`-backed string — keys resolve to themselves otherwise.

## Verification checklist

Before finishing work: run `npm run typecheck`, `npm run lint`, and `npm test`.
