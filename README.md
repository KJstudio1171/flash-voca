# Flash Voca

Android-first flashcard vocabulary MVP scaffold built with Expo, Expo Router, React Native, TypeScript, Reanimated, SQLite, Supabase, and TanStack Query.

## Current Scope

- Free MVP lane
  - create personal decks
  - edit deck metadata and cards
  - run a personal study session with local review logging
- Paid MVP lane
  - browse official bundle catalog
  - open bundle detail
  - keep billing and entitlement boundaries separate so a real store SDK can be attached later

Excluded for now:

- user marketplace
- collaborative editing
- AI deck generation

## Project Structure

```text
app/                     Expo Router routes
src/app/                 providers and bootstrap gate
src/core/database/       SQLite client, schema, initialization, seed, local table types
src/core/repositories/   repository contracts + SQLite/Supabase adapters
src/core/services/       app use cases and store/entitlement boundaries
src/core/supabase/       Supabase config and client entrypoint
src/features/            screen-level feature code
src/shared/              theme, UI primitives, animation primitives, utils
```

## Route Map

- `/` home
- `/decks` my deck list
- `/decks/new/edit` create deck
- `/decks/[deckId]/edit` edit deck
- `/study/[deckId]` study screen
- `/store` store catalog
- `/bundles/[bundleId]` bundle detail
- `/profile` profile and sync boundary

## Data Flow

The UI does not call SQLite or Supabase directly.

```text
Screen -> TanStack Query hook -> Service -> Repository -> SQLite / Supabase
```

- SQLite is the source of truth for local decks, cards, study states, review logs, sync queue items, and entitlement cache.
- Supabase is only connected through a separate client/gateway boundary for future auth, sync, and entitlements.
- Billing is intentionally isolated behind `BillingGateway`.

## Local Data Model

Core tables already scaffolded:

- `local_decks`
- `local_deck_cards`
- `local_user_card_states`
- `local_review_logs`
- `pending_sync_operations`
- `cached_entitlements`
- `bundles`
- `bundle_items`

`seedMvpDataAsync()` inserts a small starter dataset so routes can render immediately after first boot.

## Getting Started

1. Install dependencies.
2. Add optional Supabase env vars if you want to activate the remote entitlement boundary.
3. Start Expo.

```bash
npm install
npx expo start
```

Optional env vars:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Implementation Notes

- `src/shared/animation/AnimatedFlipCard.tsx` and `src/shared/animation/SwipeStudyCard.tsx` are the reusable motion primitives for the learning flow.
- `src/core/services/createAppServices.ts` is the composition root for repositories, services, Supabase sync gateway, and billing placeholder.
- `src/features/decks/screens/DeckEditorScreen.tsx` persists personal decks through the service/repository path.
- `src/features/study/screens/StudyScreen.tsx` records review logs and updates `user_card_states`.
- `src/features/store/screens/*` render the paid lane without coupling UI to a concrete billing SDK yet.

## Immediate Next Work

1. Add auth/session identity and replace `LOCAL_USER_ID` with a real user scope.
2. Connect Play Billing or RevenueCat to `BillingGateway` and bridge purchases into local entitlements.
3. Add bidirectional sync rules for decks, review logs, and entitlements between SQLite and Supabase.
