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
- **Bootstrap**: `AppBootstrapGate` initializes the DB (schema + seed data) before rendering the app tree.

### Path aliases

`@/*` maps to the project root (configured in `tsconfig.json`). Use `@/src/...` for source imports.

### Key boundaries

- **Billing**: isolated behind `BillingGateway` interface (`src/core/services/billing/`). Currently `NoopBillingGateway`; designed for future Play Billing / RevenueCat integration.
- **Entitlements**: `EntitlementService` mediates between local cache (`cached_entitlements` table), Supabase gateway, and billing gateway.
- **Sync queue**: `pending_sync_operations` table + `enqueuePendingSyncOperation` helper. Repos enqueue sync ops; actual sync is not yet wired.
- **User identity**: hardcoded as `LOCAL_USER_ID = "local-user"` in `src/core/config/constants.ts`. Auth is not yet implemented.

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

## Testing

- Test files live in `__tests__/`, mirroring the source structure (`services/`, `repositories/`, etc.).
- Mock data: use factory functions in `__tests__/helpers/factories.ts`.
- Mock repositories: use helpers in `__tests__/helpers/mockRepositories.ts`.
- Service tests use interface-based manual mocks. Do not use `jest.mock()`.

## Verification checklist

Before finishing work: run `npm run typecheck`, `npm run lint`, and `npm test`.
