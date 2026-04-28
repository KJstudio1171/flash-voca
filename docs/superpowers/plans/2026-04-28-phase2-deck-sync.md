# Phase 2 — Deck Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push pending `pending_sync_operations` rows to Supabase, pull incremental updates from `user_decks`/`user_deck_cards`, and merge them into the local SQLite store with last-write-wins semantics, exposed via a "Sync now" button on the Profile screen.

**Architecture:** A new `DeckSyncService` orchestrates two stages: `PendingSyncWorker.flushDeckOperationsAsync()` then incremental pull through `SupabaseDeckGateway`, finished by `DeckSyncMerger.mergePulledAsync()`. The Supabase schema enforces LWW with a `BEFORE UPDATE` trigger; user RLS ensures clients only ever see/edit their own rows.

**Tech Stack:** TypeScript, Expo 54 / RN, expo-sqlite, Supabase JS SDK, Jest.

**Spec:** `docs/superpowers/specs/2026-04-28-phase2-deck-sync-design.md`

---

## File Structure

### New Supabase artifacts
- `supabase/migrations/202604280002_phase2_deck_sync.sql`

### New client files
- `src/core/repositories/contracts/RemoteDeckGateway.ts` — types + interface
- `src/core/repositories/supabase/SupabaseDeckGateway.ts` — Supabase implementation
- `src/core/repositories/sqlite/SqliteAppMetaRepository.ts` — `app_meta` get/set wrapper
- `src/core/repositories/contracts/AppMetaStore.ts` — interface for the wrapper
- `src/core/services/DeckSyncMerger.ts`
- `src/core/services/PendingSyncWorker.ts`
- `src/core/services/DeckSyncService.ts`
- `src/features/profile/components/SyncStatusCard.tsx`
- `src/features/profile/hooks/useDeckSync.ts`
- `__tests__/services/DeckSyncMerger.test.ts`
- `__tests__/services/PendingSyncWorker.test.ts`
- `__tests__/services/DeckSyncService.test.ts`
- `__tests__/repositories/SqliteDeckRepository.applyRemoteDeck.test.ts`
- `__tests__/helpers/MockRemoteDeckGateway.ts`
- `__tests__/helpers/MockAppMetaStore.ts`
- `__tests__/helpers/createMockRemoteDeckPayload.ts`

### Modified files
- `src/core/repositories/contracts/DeckRepository.ts` — add 6 new methods
- `src/core/repositories/sqlite/SqliteDeckRepository.ts` — implement new methods + adjust enqueue payload to include `deletedAt`, drop `imageUri`/`ownerId` from sent payload
- `src/core/services/createAppServices.ts` — wire DeckSyncService
- `src/app/AppProviders.tsx` — expose deckSyncService
- `src/app/bootstrap/AppBootstrapGate.tsx` — auto-trigger sync after bootstrap
- `src/features/profile/screens/ProfileScreen.tsx` — render SyncStatusCard
- `src/core/observability/eventRegistry.ts` — `deck_sync_*` events
- `src/shared/i18n/locales/{ko,en,ja,zh}.json` — `deckSync.*`, `errors.deckSync.*`
- `__tests__/helpers/mockRepositories.ts` — extend `createMockDeckRepository` with 6 new methods (returning sane defaults)

---

## Task 1: Supabase migration SQL

**Files:**
- Create: `supabase/migrations/202604280002_phase2_deck_sync.sql`

- [ ] **Step 1: Write migration**

```sql
-- 202604280002_phase2_deck_sync.sql
-- Phase 2: user-content sync schema

CREATE TABLE IF NOT EXISTS user_decks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  accent_color TEXT NOT NULL DEFAULT '#0F766E',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL DEFAULT 'ko',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_decks_user_updated
  ON user_decks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_decks_user_deleted
  ON user_decks(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS user_deck_cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  term TEXT NOT NULL,
  meaning TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  example TEXT,
  example_translation TEXT,
  note TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  synonyms TEXT,
  antonyms TEXT,
  related_expressions TEXT,
  source TEXT,
  position INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_deck_cards_user_updated
  ON user_deck_cards(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_deck_cards_deck_position
  ON user_deck_cards(deck_id, position ASC);

ALTER TABLE user_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_decks_owner_all ON user_decks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_deck_cards_owner_all ON user_deck_cards
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION reject_stale_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_decks_lww BEFORE UPDATE ON user_decks
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();
CREATE TRIGGER user_deck_cards_lww BEFORE UPDATE ON user_deck_cards
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();

CREATE OR REPLACE FUNCTION touch_parent_deck() RETURNS trigger AS $$
BEGIN
  UPDATE user_decks SET updated_at = NEW.updated_at
  WHERE id = NEW.deck_id AND updated_at < NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deck_cards_touch_parent
  AFTER INSERT OR UPDATE ON user_deck_cards
  FOR EACH ROW EXECUTE FUNCTION touch_parent_deck();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/202604280002_phase2_deck_sync.sql
git commit -m "feat(supabase): user_decks/user_deck_cards with RLS and LWW trigger"
```

---

## Task 2: i18n keys + deck_sync_* analytics events

**Files:**
- Modify: `src/shared/i18n/locales/{ko,en,ja,zh}.json`
- Modify: `src/core/observability/eventRegistry.ts`

- [ ] **Step 1: Add `deckSync` namespace to ko.json**

Insert as a new top-level key (after `billing`, before `settings` or any later top-level):

```json
"deckSync": {
  "title": "콘텐츠 동기화",
  "lastSyncedAt": "마지막 동기화: {{time}}",
  "never": "동기화한 적 없음",
  "button": "지금 동기화",
  "syncing": "동기화 중...",
  "failedItems": "동기화 실패 항목: {{count}}개",
  "retry": "재시도",
  "toastSuccess": "동기화를 완료했어요.",
  "toastNoChanges": "변경된 내용이 없어요."
},
```

Inside the existing `errors` object, add a `deckSync` subtree (alongside `auth` / `billing`):

```json
"deckSync": {
  "push": "변경 사항을 보내지 못했어요.",
  "pull": "최신 데이터를 가져오지 못했어요."
}
```

- [ ] **Step 2: Mirror in en.json**

```json
"deckSync": {
  "title": "Content sync",
  "lastSyncedAt": "Last synced: {{time}}",
  "never": "Never synced",
  "button": "Sync now",
  "syncing": "Syncing...",
  "failedItems": "Failed items: {{count}}",
  "retry": "Retry",
  "toastSuccess": "Sync complete.",
  "toastNoChanges": "No changes to sync."
}
```

`errors.deckSync` in en.json:
```json
"deckSync": {
  "push": "Could not send your changes.",
  "pull": "Could not fetch the latest data."
}
```

- [ ] **Step 3: Mirror in ja.json**

```json
"deckSync": {
  "title": "コンテンツ同期",
  "lastSyncedAt": "最終同期: {{time}}",
  "never": "未同期",
  "button": "今すぐ同期",
  "syncing": "同期中...",
  "failedItems": "同期失敗項目: {{count}}件",
  "retry": "再試行",
  "toastSuccess": "同期が完了しました。",
  "toastNoChanges": "変更はありません。"
}
```

`errors.deckSync` in ja.json:
```json
"deckSync": {
  "push": "変更を送信できませんでした。",
  "pull": "最新データを取得できませんでした。"
}
```

- [ ] **Step 4: Mirror in zh.json**

```json
"deckSync": {
  "title": "内容同步",
  "lastSyncedAt": "上次同步: {{time}}",
  "never": "尚未同步",
  "button": "立即同步",
  "syncing": "同步中...",
  "failedItems": "同步失败项: {{count}}",
  "retry": "重试",
  "toastSuccess": "同步完成。",
  "toastNoChanges": "没有要同步的更改。"
}
```

`errors.deckSync` in zh.json:
```json
"deckSync": {
  "push": "无法发送您的更改。",
  "pull": "无法获取最新数据。"
}
```

- [ ] **Step 5: Add `deck_sync_*` events to `src/core/observability/eventRegistry.ts`**

Append before the closing `} satisfies` of the registry literal:

```ts
  deck_sync_started: { allowedProps: ["trigger"] as const },
  deck_sync_completed: { allowedProps: ["pushed", "pulled", "durationMs"] as const },
  deck_sync_failed: { allowedProps: ["reason", "stage"] as const },
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck
node -e "for (const f of ['ko','en','ja','zh']) JSON.parse(require('fs').readFileSync(\`src/shared/i18n/locales/\${f}.json\`,'utf8'))"
```
Expected: PASS, all 4 files valid JSON.

- [ ] **Step 7: Commit**

```bash
git add src/shared/i18n/locales/ src/core/observability/eventRegistry.ts
git commit -m "feat(i18n,observability): add deckSync namespace and events"
```

---

## Task 3: AppMetaStore (interface + SQLite impl)

**Files:**
- Create: `src/core/repositories/contracts/AppMetaStore.ts`
- Create: `src/core/repositories/sqlite/SqliteAppMetaRepository.ts`

- [ ] **Step 1: Create the interface**

```ts
// src/core/repositories/contracts/AppMetaStore.ts
export interface AppMetaStore {
  getValueAsync(key: string): Promise<string | null>;
  setValueAsync(key: string, value: string): Promise<void>;
}
```

- [ ] **Step 2: Implement against the existing `app_meta` table**

```ts
// src/core/repositories/sqlite/SqliteAppMetaRepository.ts
import { getDatabaseAsync } from "@/src/core/database/client";
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";

export class SqliteAppMetaRepository implements AppMetaStore {
  async getValueAsync(key: string): Promise<string | null> {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ value: string | null }>(
      "SELECT value FROM app_meta WHERE key = ?;",
      [key],
    );
    return row?.value ?? null;
  }

  async setValueAsync(key: string, value: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value],
    );
  }
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/repositories/contracts/AppMetaStore.ts \
        src/core/repositories/sqlite/SqliteAppMetaRepository.ts
git commit -m "feat(repo): AppMetaStore for app_meta key/value access"
```

---

## Task 4: RemoteDeckGateway contract + types

**Files:**
- Create: `src/core/repositories/contracts/RemoteDeckGateway.ts`

- [ ] **Step 1: Write the contract**

```ts
// src/core/repositories/contracts/RemoteDeckGateway.ts
export interface RemoteDeckRecord {
  id: string;
  title: string;
  description: string | null;
  accentColor: string;
  visibility: "private" | "public";
  sourceLanguage: string;
  targetLanguage: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteCardRecord {
  id: string;
  deckId: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  difficulty: "easy" | "medium" | "hard";
  example: string | null;
  exampleTranslation: string | null;
  note: string | null;
  tags: string[];
  synonyms: string | null;
  antonyms: string | null;
  relatedExpressions: string | null;
  source: string | null;
  position: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteDeckPayload {
  deck: RemoteDeckRecord;
  cards: RemoteCardRecord[];
}

export interface RemoteDeckGateway {
  upsertDeckAsync(userId: string, payload: RemoteDeckPayload): Promise<void>;
  softDeleteDeckAsync(
    userId: string,
    deckId: string,
    deletedAt: string,
  ): Promise<void>;
  pullDecksUpdatedAfterAsync(
    userId: string,
    since: string | null,
    limit: number,
  ): Promise<RemoteDeckPayload[]>;
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/repositories/contracts/RemoteDeckGateway.ts
git commit -m "feat(contracts): RemoteDeckGateway types"
```

---

## Task 5: SupabaseDeckGateway implementation

**Files:**
- Create: `src/core/repositories/supabase/SupabaseDeckGateway.ts`

- [ ] **Step 1: Implement gateway**

```ts
// src/core/repositories/supabase/SupabaseDeckGateway.ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { SyncError } from "@/src/core/errors";
import type {
  RemoteCardRecord,
  RemoteDeckGateway,
  RemoteDeckPayload,
  RemoteDeckRecord,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";

interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  accent_color: string;
  visibility: "private" | "public";
  source_language: string;
  target_language: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CardRow {
  id: string;
  deck_id: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  difficulty: "easy" | "medium" | "hard";
  example: string | null;
  example_translation: string | null;
  note: string | null;
  tags: string[] | null;
  synonyms: string | null;
  antonyms: string | null;
  related_expressions: string | null;
  source: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDeck(row: DeckRow): RemoteDeckRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    accentColor: row.accent_color,
    visibility: row.visibility,
    sourceLanguage: row.source_language,
    targetLanguage: row.target_language,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCard(row: CardRow): RemoteCardRecord {
  return {
    id: row.id,
    deckId: row.deck_id,
    term: row.term,
    meaning: row.meaning,
    pronunciation: row.pronunciation,
    partOfSpeech: row.part_of_speech,
    difficulty: row.difficulty,
    example: row.example,
    exampleTranslation: row.example_translation,
    note: row.note,
    tags: Array.isArray(row.tags) ? row.tags : [],
    synonyms: row.synonyms,
    antonyms: row.antonyms,
    relatedExpressions: row.related_expressions,
    source: row.source,
    position: row.position,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseDeckGateway implements RemoteDeckGateway {
  constructor(private readonly client: SupabaseClient) {}

  async upsertDeckAsync(userId: string, payload: RemoteDeckPayload): Promise<void> {
    const { error: deckError } = await this.client.from("user_decks").upsert({
      id: payload.deck.id,
      user_id: userId,
      title: payload.deck.title,
      description: payload.deck.description,
      accent_color: payload.deck.accentColor,
      visibility: payload.deck.visibility,
      source_language: payload.deck.sourceLanguage,
      target_language: payload.deck.targetLanguage,
      deleted_at: payload.deck.deletedAt,
      created_at: payload.deck.createdAt,
      updated_at: payload.deck.updatedAt,
    });
    if (deckError) throw new SyncError({ cause: deckError });

    if (payload.cards.length === 0) return;

    const { error: cardsError } = await this.client.from("user_deck_cards").upsert(
      payload.cards.map((c) => ({
        id: c.id,
        deck_id: c.deckId,
        user_id: userId,
        term: c.term,
        meaning: c.meaning,
        pronunciation: c.pronunciation,
        part_of_speech: c.partOfSpeech,
        difficulty: c.difficulty,
        example: c.example,
        example_translation: c.exampleTranslation,
        note: c.note,
        tags: c.tags,
        synonyms: c.synonyms,
        antonyms: c.antonyms,
        related_expressions: c.relatedExpressions,
        source: c.source,
        position: c.position,
        deleted_at: c.deletedAt,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      })),
    );
    if (cardsError) throw new SyncError({ cause: cardsError });
  }

  async softDeleteDeckAsync(
    userId: string,
    deckId: string,
    deletedAt: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("user_decks")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", deckId)
      .eq("user_id", userId);
    if (error) throw new SyncError({ cause: error });
  }

  async pullDecksUpdatedAfterAsync(
    userId: string,
    since: string | null,
    limit: number,
  ): Promise<RemoteDeckPayload[]> {
    let decksQuery = this.client
      .from("user_decks")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (since) decksQuery = decksQuery.gt("updated_at", since);

    const { data: decks, error } = await decksQuery;
    if (error) throw new SyncError({ cause: error });
    if (!decks || decks.length === 0) return [];

    const deckIds = decks.map((d) => d.id);
    const { data: cards, error: cardsError } = await this.client
      .from("user_deck_cards")
      .select("*")
      .eq("user_id", userId)
      .in("deck_id", deckIds);
    if (cardsError) throw new SyncError({ cause: cardsError });

    const cardsByDeck = new Map<string, RemoteCardRecord[]>();
    for (const c of (cards ?? []) as CardRow[]) {
      const list = cardsByDeck.get(c.deck_id) ?? [];
      list.push(mapCard(c));
      cardsByDeck.set(c.deck_id, list);
    }

    return (decks as DeckRow[]).map((d) => ({
      deck: mapDeck(d),
      cards: cardsByDeck.get(d.id) ?? [],
    }));
  }
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/repositories/supabase/SupabaseDeckGateway.ts
git commit -m "feat(supabase): SupabaseDeckGateway implementation"
```

---

## Task 6: DeckRepository contract — add sync-supporting methods

**Files:**
- Modify: `src/core/repositories/contracts/DeckRepository.ts`
- Modify: `__tests__/helpers/mockRepositories.ts`

- [ ] **Step 1: Extend DeckRepository contract**

Replace the file content with:

```ts
import { Deck, DeckDetail, SaveDeckPayload } from "@/src/core/domain/models";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface PendingDeckOp {
  id: string;
  entityId: string;
  operationType: "upsert" | "delete";
  payload: unknown;
  attemptCount: number;
  availableAt: string;
}

export interface DeckRepository {
  listDecksAsync(): Promise<Deck[]>;
  getDeckByIdAsync(deckId: string): Promise<DeckDetail | null>;
  saveDeckAsync(payload: SaveDeckPayload): Promise<DeckDetail>;
  deleteDeckAsync(deckId: string): Promise<void>;

  // Sync support (Phase 2)
  listPendingDeckOpsAsync(): Promise<PendingDeckOp[]>;
  markOpProcessingAsync(opId: string): Promise<void>;
  deleteOpAsync(opId: string): Promise<void>;
  markOpFailedAsync(
    opId: string,
    error: { message: string; permanent: boolean },
    nextAvailableAt: string,
  ): Promise<void>;
  countFailedDeckOpsAsync(): Promise<number>;
  markDeckSyncedAsync(deckId: string): Promise<void>;
  applyRemoteDeckAsync(payload: RemoteDeckPayload): Promise<void>;
}
```

- [ ] **Step 2: Update mockRepositories.ts**

Open `__tests__/helpers/mockRepositories.ts`. Replace `createMockDeckRepository` with:

```ts
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";

export function createMockDeckRepository(
  overrides?: Partial<DeckRepository>,
): DeckRepository {
  return {
    listDecksAsync: jest.fn().mockResolvedValue([]),
    getDeckByIdAsync: jest.fn().mockResolvedValue(null),
    saveDeckAsync: jest.fn(),
    deleteDeckAsync: jest.fn(),
    listPendingDeckOpsAsync: jest.fn().mockResolvedValue([]),
    markOpProcessingAsync: jest.fn().mockResolvedValue(undefined),
    deleteOpAsync: jest.fn().mockResolvedValue(undefined),
    markOpFailedAsync: jest.fn().mockResolvedValue(undefined),
    countFailedDeckOpsAsync: jest.fn().mockResolvedValue(0),
    markDeckSyncedAsync: jest.fn().mockResolvedValue(undefined),
    applyRemoteDeckAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail at `SqliteDeckRepository.ts` because the new methods aren't implemented yet. Proceed to Task 7. Test mocks compile because they have all methods.

---

## Task 7: SqliteDeckRepository — implement queue + sync-state methods

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteDeckRepository.ts`

- [ ] **Step 1: Add queue helpers (no tests needed at this stage — covered by integration tests)**

Add these methods to the `SqliteDeckRepository` class. Place them after `deleteDeckAsync`:

```ts
async listPendingDeckOpsAsync() {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<{
    id: string;
    entity_id: string;
    operation_type: "upsert" | "delete";
    payload: string | null;
    attempt_count: number;
    available_at: string;
  }>(
    `SELECT id, entity_id, operation_type, payload, attempt_count, available_at
     FROM pending_sync_operations
     WHERE entity_type = 'deck' AND status = 'pending'
       AND available_at <= ?
     ORDER BY created_at ASC;`,
    [new Date().toISOString()],
  );
  return rows.map((r) => ({
    id: r.id,
    entityId: r.entity_id,
    operationType: r.operation_type,
    payload: r.payload ? JSON.parse(r.payload) : null,
    attemptCount: r.attempt_count,
    availableAt: r.available_at,
  }));
}

async markOpProcessingAsync(opId: string) {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `UPDATE pending_sync_operations
     SET status = 'processing', updated_at = ?
     WHERE id = ?;`,
    [new Date().toISOString(), opId],
  );
}

async deleteOpAsync(opId: string) {
  const db = await getDatabaseAsync();
  await db.runAsync("DELETE FROM pending_sync_operations WHERE id = ?;", [opId]);
}

async markOpFailedAsync(
  opId: string,
  error: { message: string; permanent: boolean },
  nextAvailableAt: string,
) {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE pending_sync_operations
     SET status = ?, attempt_count = attempt_count + 1,
         available_at = ?, last_error = ?, updated_at = ?
     WHERE id = ?;`,
    [
      error.permanent ? "failed" : "pending",
      nextAvailableAt,
      error.message,
      now,
      opId,
    ],
  );
}

async countFailedDeckOpsAsync() {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_sync_operations
     WHERE entity_type = 'deck' AND status = 'failed';`,
  );
  return row?.count ?? 0;
}

async markDeckSyncedAsync(deckId: string) {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE local_decks
     SET sync_state = 'synced', last_synced_at = ?
     WHERE id = ?;`,
    [now, deckId],
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: typecheck still fails because `applyRemoteDeckAsync` not added yet. Continue to Task 8.

---

## Task 8: SqliteDeckRepository.applyRemoteDeckAsync (TDD)

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteDeckRepository.ts`
- Create: `__tests__/repositories/SqliteDeckRepository.applyRemoteDeck.test.ts`

> Because SqliteDeckRepository talks to a real SQLite DB, the test approach in this codebase wraps the real client. We will test the **logic of merging** by extracting a pure function `mergeRemoteDeckIntoTx` and testing the SQL calls against a mock transaction.

- [ ] **Step 1: Write failing test**

```ts
// __tests__/repositories/SqliteDeckRepository.applyRemoteDeck.test.ts
import { mergeRemoteDeckIntoTx } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

type RunCall = { sql: string; params: unknown[] };

function createMockTx() {
  const calls: RunCall[] = [];
  return {
    calls,
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
    }),
  };
}

const samplePayload: RemoteDeckPayload = {
  deck: {
    id: "deck_x",
    title: "X",
    description: null,
    accentColor: "#0F766E",
    visibility: "private",
    sourceLanguage: "en",
    targetLanguage: "ko",
    deletedAt: null,
    createdAt: "2026-04-28T00:00:00Z",
    updatedAt: "2026-04-28T00:00:00Z",
  },
  cards: [
    {
      id: "card_a",
      deckId: "deck_x",
      term: "hi",
      meaning: "안녕",
      pronunciation: null,
      partOfSpeech: null,
      difficulty: "medium",
      example: null,
      exampleTranslation: null,
      note: null,
      tags: [],
      synonyms: null,
      antonyms: null,
      relatedExpressions: null,
      source: null,
      position: 0,
      deletedAt: null,
      createdAt: "2026-04-28T00:00:00Z",
      updatedAt: "2026-04-28T00:00:00Z",
    },
  ],
};

describe("mergeRemoteDeckIntoTx", () => {
  it("upserts deck and replaces cards, marks synced, sets is_deleted=0 for non-deleted", async () => {
    const tx = createMockTx();
    await mergeRemoteDeckIntoTx(
      tx as unknown as Parameters<typeof mergeRemoteDeckIntoTx>[0],
      "user-1",
      samplePayload,
    );

    const sqls = tx.calls.map((c) => c.sql);
    expect(sqls.some((s) => s.includes("INSERT INTO local_decks"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM local_deck_cards"))).toBe(true);
    expect(sqls.some((s) => s.includes("INSERT INTO local_deck_cards"))).toBe(true);
  });

  it("marks deck deleted (is_deleted=1) when payload has deletedAt", async () => {
    const tx = createMockTx();
    const payload = {
      ...samplePayload,
      deck: { ...samplePayload.deck, deletedAt: "2026-04-28T00:00:00Z" },
    };
    await mergeRemoteDeckIntoTx(
      tx as unknown as Parameters<typeof mergeRemoteDeckIntoTx>[0],
      "user-1",
      payload,
    );

    const deckUpsertCall = tx.calls.find((c) =>
      c.sql.includes("INSERT INTO local_decks"),
    );
    expect(deckUpsertCall).toBeTruthy();
    // is_deleted is the 10th param in the column order — check that 1 appears
    expect(deckUpsertCall!.params).toEqual(
      expect.arrayContaining([1]),
    );
  });
});
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npx jest __tests__/repositories/SqliteDeckRepository.applyRemoteDeck.test.ts
```
Expected: FAIL — `mergeRemoteDeckIntoTx` not exported.

- [ ] **Step 3: Implement and export `mergeRemoteDeckIntoTx` + `applyRemoteDeckAsync`**

In `src/core/repositories/sqlite/SqliteDeckRepository.ts`, add at the bottom of the file (or wherever helpers live):

```ts
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface MergeRemoteDeckTx {
  runAsync(sql: string, params: unknown[]): Promise<unknown>;
}

export async function mergeRemoteDeckIntoTx(
  tx: MergeRemoteDeckTx,
  ownerId: string,
  payload: RemoteDeckPayload,
): Promise<void> {
  const isDeleted = payload.deck.deletedAt ? 1 : 0;
  const now = new Date().toISOString();

  await tx.runAsync(
    `INSERT INTO local_decks (
      id, owner_id, title, description, source_type, accent_color,
      visibility, source_language, target_language, is_deleted,
      sync_state, last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      accent_color = excluded.accent_color,
      visibility = excluded.visibility,
      source_language = excluded.source_language,
      target_language = excluded.target_language,
      is_deleted = excluded.is_deleted,
      sync_state = 'synced',
      last_synced_at = excluded.last_synced_at,
      updated_at = excluded.updated_at;`,
    [
      payload.deck.id,
      ownerId,
      payload.deck.title,
      payload.deck.description,
      payload.deck.accentColor,
      payload.deck.visibility,
      payload.deck.sourceLanguage,
      payload.deck.targetLanguage,
      isDeleted,
      now,
      payload.deck.createdAt,
      payload.deck.updatedAt,
    ],
  );

  await tx.runAsync(
    "DELETE FROM local_deck_cards WHERE deck_id = ?;",
    [payload.deck.id],
  );

  for (const card of payload.cards) {
    if (card.deletedAt) continue; // server-side delete: don't re-insert
    await tx.runAsync(
      `INSERT INTO local_deck_cards (
        id, deck_id, term, meaning, pronunciation, part_of_speech, difficulty,
        example, example_translation, note, tags, synonyms, antonyms,
        related_expressions, source, image_uri, position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?);`,
      [
        card.id,
        card.deckId,
        card.term,
        card.meaning,
        card.pronunciation,
        card.partOfSpeech,
        card.difficulty,
        card.example,
        card.exampleTranslation,
        card.note,
        JSON.stringify(card.tags),
        card.synonyms,
        card.antonyms,
        card.relatedExpressions,
        card.source,
        card.position,
        card.createdAt,
        card.updatedAt,
      ],
    );
  }
}
```

Then on the `SqliteDeckRepository` class, add:

```ts
async applyRemoteDeckAsync(payload: RemoteDeckPayload): Promise<void> {
  const db = await getDatabaseAsync();
  const ownerId = this.auth.getCurrentUserId();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await mergeRemoteDeckIntoTx(
      { runAsync: (sql, params) => tx.runAsync(sql, params) as Promise<unknown> },
      ownerId,
      payload,
    );
  });
}
```

- [ ] **Step 4: Run tests — PASS**

```bash
npx jest __tests__/repositories/SqliteDeckRepository.applyRemoteDeck.test.ts
npm run typecheck && npm test
```
Expected: ALL PASS (full suite green now that the contract has all impls).

- [ ] **Step 5: Commit Tasks 6+7+8 together**

```bash
git add src/core/repositories/contracts/DeckRepository.ts \
        src/core/repositories/sqlite/SqliteDeckRepository.ts \
        __tests__/helpers/mockRepositories.ts \
        __tests__/repositories/SqliteDeckRepository.applyRemoteDeck.test.ts
git commit -m "feat(repo): SqliteDeckRepository sync helpers + applyRemoteDeck"
```

---

## Task 9: Adjust enqueue payloads to include deletedAt and drop imageUri/ownerId

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteDeckRepository.ts`

- [ ] **Step 1: Update upsert payload (lines ~471–509 area)**

Find the `enqueuePendingSyncOperationAsync` call inside `saveDeckAsync` and change the payload to align with `RemoteDeckPayload`:

```ts
await enqueuePendingSyncOperationAsync(tx, {
  entityType: "deck",
  entityId: deckId,
  operationType: "upsert",
  payload: {
    deck: {
      id: deckId,
      title: normalizedTitle,
      description: normalizedDescription,
      accentColor,
      visibility,
      sourceLanguage,
      targetLanguage,
      deletedAt: null,
      createdAt,
      updatedAt: now,
    },
    cards: persistedCards.map((card) => ({
      id: card.id,
      deckId,
      term: card.term,
      meaning: card.meaning,
      pronunciation: card.pronunciation,
      partOfSpeech: card.partOfSpeech,
      difficulty: card.difficulty,
      example: card.example,
      exampleTranslation: card.exampleTranslation,
      note: card.note,
      tags: card.tags,
      synonyms: card.synonyms,
      antonyms: card.antonyms,
      relatedExpressions: card.relatedExpressions,
      source: card.source,
      position: card.position,
      deletedAt: null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    })),
  },
});
```

(Note: `ownerId` and `imageUri` and `sourceType` removed.)

- [ ] **Step 2: Update delete payload (lines ~545–553 area)**

Change to:

```ts
await enqueuePendingSyncOperationAsync(tx, {
  entityType: "deck",
  entityId: deckId,
  operationType: "delete",
  payload: {
    id: deckId,
    deletedAt: now,
  },
});
```

(No change in shape here — already minimal.)

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/repositories/sqlite/SqliteDeckRepository.ts
git commit -m "refactor(deck): align enqueue payloads with RemoteDeckPayload shape"
```

---

## Task 10: PendingSyncWorker (TDD)

**Files:**
- Create: `src/core/services/PendingSyncWorker.ts`
- Create: `__tests__/services/PendingSyncWorker.test.ts`
- Create: `__tests__/helpers/MockRemoteDeckGateway.ts`

- [ ] **Step 1: Mock helper**

```ts
// __tests__/helpers/MockRemoteDeckGateway.ts
import type { RemoteDeckGateway } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export function createMockRemoteDeckGateway(
  overrides: Partial<RemoteDeckGateway> = {},
): RemoteDeckGateway {
  return {
    upsertDeckAsync: jest.fn().mockResolvedValue(undefined),
    softDeleteDeckAsync: jest.fn().mockResolvedValue(undefined),
    pullDecksUpdatedAfterAsync: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}
```

- [ ] **Step 2: Write failing test**

```ts
// __tests__/services/PendingSyncWorker.test.ts
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";
import { createMockDeckRepository } from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckGateway } from "@/__tests__/helpers/MockRemoteDeckGateway";
import { createMockAuthService, TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";

describe("PendingSyncWorker.flushDeckOperationsAsync", () => {
  it("processes upsert ops by calling upsertDeckAsync, deletes the queue row, marks deck synced", async () => {
    const upsertPayload = {
      deck: {
        id: "deck_x",
        title: "X",
        description: null,
        accentColor: "#000",
        visibility: "private",
        sourceLanguage: "en",
        targetLanguage: "ko",
        deletedAt: null,
        createdAt: "2026-04-28T00:00:00Z",
        updatedAt: "2026-04-28T00:00:00Z",
      },
      cards: [],
    };
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-1",
          entityId: "deck_x",
          operationType: "upsert",
          payload: upsertPayload,
          attemptCount: 0,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();

    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const result = await worker.flushDeckOperationsAsync();

    expect(remote.upsertDeckAsync).toHaveBeenCalledWith(TEST_USER_ID, upsertPayload);
    expect(deckRepo.deleteOpAsync).toHaveBeenCalledWith("op-1");
    expect(deckRepo.markDeckSyncedAsync).toHaveBeenCalledWith("deck_x");
    expect(result).toEqual({ succeeded: 1, failed: 0 });
  });

  it("processes delete ops by calling softDeleteDeckAsync", async () => {
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-2",
          entityId: "deck_y",
          operationType: "delete",
          payload: { id: "deck_y", deletedAt: "2026-04-28T01:00:00Z" },
          attemptCount: 0,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    await worker.flushDeckOperationsAsync();

    expect(remote.softDeleteDeckAsync).toHaveBeenCalledWith(
      TEST_USER_ID,
      "deck_y",
      "2026-04-28T01:00:00Z",
    );
    expect(deckRepo.deleteOpAsync).toHaveBeenCalledWith("op-2");
  });

  it("on failure increments attempt and schedules backoff (not permanent until 5)", async () => {
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-3",
          entityId: "deck_y",
          operationType: "upsert",
          payload: {
            deck: { id: "deck_y", title: "y", description: null, accentColor: "#0",
              visibility: "private", sourceLanguage: "en", targetLanguage: "ko",
              deletedAt: null, createdAt: "x", updatedAt: "x" },
            cards: [],
          },
          attemptCount: 2,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const remote = createMockRemoteDeckGateway({
      upsertDeckAsync: jest.fn().mockRejectedValue(new Error("net")),
    });
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    const result = await worker.flushDeckOperationsAsync();

    expect(deckRepo.markOpFailedAsync).toHaveBeenCalledWith(
      "op-3",
      expect.objectContaining({ permanent: false }),
      expect.any(String),
    );
    expect(result).toEqual({ succeeded: 0, failed: 1 });
  });

  it("marks op as permanently failed once attemptCount reaches 4 (5th failure)", async () => {
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-4",
          entityId: "deck_y",
          operationType: "upsert",
          payload: {
            deck: { id: "deck_y", title: "y", description: null, accentColor: "#0",
              visibility: "private", sourceLanguage: "en", targetLanguage: "ko",
              deletedAt: null, createdAt: "x", updatedAt: "x" },
            cards: [],
          },
          attemptCount: 4,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const remote = createMockRemoteDeckGateway({
      upsertDeckAsync: jest.fn().mockRejectedValue(new Error("net")),
    });
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    await worker.flushDeckOperationsAsync();

    expect(deckRepo.markOpFailedAsync).toHaveBeenCalledWith(
      "op-4",
      expect.objectContaining({ permanent: true }),
      expect.any(String),
    );
  });

  it("returns 0/0 when queue is empty", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    const result = await worker.flushDeckOperationsAsync();

    expect(result).toEqual({ succeeded: 0, failed: 0 });
    expect(remote.upsertDeckAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run — confirm FAIL**

```bash
npx jest __tests__/services/PendingSyncWorker.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// src/core/services/PendingSyncWorker.ts
import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type {
  RemoteDeckGateway,
  RemoteDeckPayload,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface FlushResult {
  succeeded: number;
  failed: number;
}

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_SECONDS = 30;
const BACKOFF_CAP_SECONDS = 3600;

function computeBackoffDate(attemptCountAfter: number): string {
  const seconds = Math.min(
    BACKOFF_BASE_SECONDS * 2 ** (attemptCountAfter - 1),
    BACKOFF_CAP_SECONDS,
  );
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export class PendingSyncWorker {
  constructor(
    private readonly deckRepo: DeckRepository,
    private readonly remote: RemoteDeckGateway,
    private readonly auth: AuthService,
  ) {}

  async flushDeckOperationsAsync(): Promise<FlushResult> {
    const userId = this.auth.getCurrentUserId();
    const ops = await this.deckRepo.listPendingDeckOpsAsync();

    let succeeded = 0;
    let failed = 0;

    for (const op of ops) {
      try {
        await this.deckRepo.markOpProcessingAsync(op.id);
        if (op.operationType === "upsert") {
          await this.remote.upsertDeckAsync(userId, op.payload as RemoteDeckPayload);
        } else {
          const del = op.payload as { id: string; deletedAt: string };
          await this.remote.softDeleteDeckAsync(userId, del.id, del.deletedAt);
        }
        await this.deckRepo.deleteOpAsync(op.id);
        await this.deckRepo.markDeckSyncedAsync(op.entityId);
        succeeded++;
      } catch (error) {
        const attemptAfter = op.attemptCount + 1;
        const permanent = attemptAfter >= MAX_ATTEMPTS;
        await this.deckRepo.markOpFailedAsync(
          op.id,
          {
            message: (error as Error)?.message ?? "unknown",
            permanent,
          },
          computeBackoffDate(attemptAfter),
        );
        failed++;
      }
    }

    return { succeeded, failed };
  }
}
```

- [ ] **Step 5: Run — PASS**

```bash
npx jest __tests__/services/PendingSyncWorker.test.ts
```
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/services/PendingSyncWorker.ts \
        __tests__/services/PendingSyncWorker.test.ts \
        __tests__/helpers/MockRemoteDeckGateway.ts
git commit -m "feat(sync): PendingSyncWorker with backoff and permanent failure"
```

---

## Task 11: DeckSyncMerger (TDD)

**Files:**
- Create: `src/core/services/DeckSyncMerger.ts`
- Create: `__tests__/services/DeckSyncMerger.test.ts`
- Create: `__tests__/helpers/createMockRemoteDeckPayload.ts`

- [ ] **Step 1: Mock helper**

```ts
// __tests__/helpers/createMockRemoteDeckPayload.ts
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export function createMockRemoteDeckPayload(
  overrides: Partial<RemoteDeckPayload["deck"]> = {},
): RemoteDeckPayload {
  return {
    deck: {
      id: "deck_x",
      title: "X",
      description: null,
      accentColor: "#0F766E",
      visibility: "private",
      sourceLanguage: "en",
      targetLanguage: "ko",
      deletedAt: null,
      createdAt: "2026-04-28T00:00:00Z",
      updatedAt: "2026-04-28T00:00:00Z",
      ...overrides,
    },
    cards: [],
  };
}
```

- [ ] **Step 2: Write failing test**

```ts
// __tests__/services/DeckSyncMerger.test.ts
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { createMockDeckRepository } from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckPayload } from "@/__tests__/helpers/createMockRemoteDeckPayload";
import type { DeckDetail } from "@/src/core/domain/models";

function localDeckDetail(updatedAt: string): DeckDetail {
  return {
    id: "deck_x",
    title: "x",
    description: null,
    sourceType: "user",
    ownerId: "u",
    accentColor: "#0",
    visibility: "private",
    sourceLanguage: "en",
    targetLanguage: "ko",
    cardCount: 0,
    createdAt: "2026-04-28T00:00:00Z",
    updatedAt,
    cards: [],
    activities: [],
  };
}

describe("DeckSyncMerger.mergePulledAsync", () => {
  it("applies remote when local does not exist", async () => {
    const deckRepo = createMockDeckRepository();
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload();
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ applied: 1, skipped: 0 });
  });

  it("applies remote when local updated_at is older", async () => {
    const deckRepo = createMockDeckRepository({
      getDeckByIdAsync: jest.fn().mockResolvedValue(
        localDeckDetail("2026-04-27T00:00:00Z"),
      ),
    });
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload({ updatedAt: "2026-04-28T12:00:00Z" });
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ applied: 1, skipped: 0 });
  });

  it("skips remote when local updated_at is newer or equal", async () => {
    const deckRepo = createMockDeckRepository({
      getDeckByIdAsync: jest.fn().mockResolvedValue(
        localDeckDetail("2026-04-28T12:00:00Z"),
      ),
    });
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload({ updatedAt: "2026-04-28T00:00:00Z" });
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 0, skipped: 1 });
  });
});
```

- [ ] **Step 3: Run — FAIL**

```bash
npx jest __tests__/services/DeckSyncMerger.test.ts
```

- [ ] **Step 4: Implement**

```ts
// src/core/services/DeckSyncMerger.ts
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface MergeResult {
  applied: number;
  skipped: number;
}

export class DeckSyncMerger {
  constructor(private readonly deckRepo: DeckRepository) {}

  async mergePulledAsync(payloads: RemoteDeckPayload[]): Promise<MergeResult> {
    let applied = 0;
    let skipped = 0;

    for (const payload of payloads) {
      const local = await this.deckRepo.getDeckByIdAsync(payload.deck.id);
      if (local && local.updatedAt >= payload.deck.updatedAt) {
        skipped++;
        continue;
      }
      await this.deckRepo.applyRemoteDeckAsync(payload);
      applied++;
    }

    return { applied, skipped };
  }
}
```

- [ ] **Step 5: PASS + commit**

```bash
npx jest __tests__/services/DeckSyncMerger.test.ts
git add src/core/services/DeckSyncMerger.ts \
        __tests__/services/DeckSyncMerger.test.ts \
        __tests__/helpers/createMockRemoteDeckPayload.ts
git commit -m "feat(sync): DeckSyncMerger with LWW comparison"
```

---

## Task 12: DeckSyncService (TDD)

**Files:**
- Create: `src/core/services/DeckSyncService.ts`
- Create: `__tests__/services/DeckSyncService.test.ts`
- Create: `__tests__/helpers/MockAppMetaStore.ts`

- [ ] **Step 1: Mock helper**

```ts
// __tests__/helpers/MockAppMetaStore.ts
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";

export function createMockAppMetaStore(
  initial: Record<string, string> = {},
): AppMetaStore {
  const store = new Map(Object.entries(initial));
  return {
    getValueAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setValueAsync: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
  };
}
```

- [ ] **Step 2: Write failing test**

```ts
// __tests__/services/DeckSyncService.test.ts
import { DeckSyncService } from "@/src/core/services/DeckSyncService";
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { createMockDeckRepository } from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckGateway } from "@/__tests__/helpers/MockRemoteDeckGateway";
import { createMockAuthService, TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";
import { createMockAppMetaStore } from "@/__tests__/helpers/MockAppMetaStore";
import { createMockRemoteDeckPayload } from "@/__tests__/helpers/createMockRemoteDeckPayload";

describe("DeckSyncService.syncAsync", () => {
  it("runs push then pull and updates last_pulled_at", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway({
      pullDecksUpdatedAfterAsync: jest.fn().mockResolvedValue([
        createMockRemoteDeckPayload({ updatedAt: "2026-04-28T10:00:00Z" }),
      ]),
    });
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    const result = await svc.syncAsync({ trigger: "manual" });

    expect(remote.pullDecksUpdatedAfterAsync).toHaveBeenCalledWith(
      TEST_USER_ID,
      null,
      200,
    );
    expect(meta.setValueAsync).toHaveBeenCalledWith(
      "deck_sync.last_pulled_at",
      "2026-04-28T10:00:00Z",
    );
    expect(result.pulled).toBe(1);
  });

  it("uses stored last_pulled_at on subsequent runs", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore({
      "deck_sync.last_pulled_at": "2026-04-27T00:00:00Z",
    });
    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    await svc.syncAsync({ trigger: "manual" });

    expect(remote.pullDecksUpdatedAfterAsync).toHaveBeenCalledWith(
      TEST_USER_ID,
      "2026-04-27T00:00:00Z",
      200,
    );
  });

  it("paginates while batches return full page", async () => {
    const deckRepo = createMockDeckRepository();
    const fullBatch = Array.from({ length: 200 }, (_, i) =>
      createMockRemoteDeckPayload({
        id: `deck_${i}`,
        updatedAt: `2026-04-28T00:00:${String(i).padStart(2, "0")}Z`,
      }),
    );
    const pull = jest
      .fn()
      .mockResolvedValueOnce(fullBatch)
      .mockResolvedValueOnce([]);
    const remote = createMockRemoteDeckGateway({
      pullDecksUpdatedAfterAsync: pull,
    });
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    await svc.syncAsync({ trigger: "manual" });

    expect(pull).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run — FAIL**

```bash
npx jest __tests__/services/DeckSyncService.test.ts
```

- [ ] **Step 4: Implement**

```ts
// src/core/services/DeckSyncService.ts
import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";
import type { RemoteDeckGateway } from "@/src/core/repositories/contracts/RemoteDeckGateway";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";

const PAGE_SIZE = 200;
const LAST_PULLED_KEY = "deck_sync.last_pulled_at";

export type SyncTrigger = "bootstrap" | "manual";

export interface DeckSyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  durationMs: number;
}

export interface DeckSyncDeps {
  worker: PendingSyncWorker;
  merger: DeckSyncMerger;
  remote: RemoteDeckGateway;
  auth: AuthService;
  appMeta: AppMetaStore;
}

export class DeckSyncService {
  constructor(private readonly deps: DeckSyncDeps) {}

  async syncAsync(input: { trigger: SyncTrigger }): Promise<DeckSyncResult> {
    const startedAt = Date.now();
    const userId = this.deps.auth.getCurrentUserId();

    const flush = await this.deps.worker.flushDeckOperationsAsync();

    let cursor = await this.deps.appMeta.getValueAsync(LAST_PULLED_KEY);
    let pulledTotal = 0;

    while (true) {
      const batch = await this.deps.remote.pullDecksUpdatedAfterAsync(
        userId,
        cursor,
        PAGE_SIZE,
      );
      if (batch.length === 0) break;

      await this.deps.merger.mergePulledAsync(batch);
      pulledTotal += batch.length;

      cursor = batch[batch.length - 1].deck.updatedAt;
      await this.deps.appMeta.setValueAsync(LAST_PULLED_KEY, cursor);

      if (batch.length < PAGE_SIZE) break;
    }

    return {
      pushed: flush.succeeded,
      pulled: pulledTotal,
      failed: flush.failed,
      durationMs: Date.now() - startedAt,
    };
  }
}
```

> Note: `input.trigger` is currently unused in logic but accepted for analytics events that the caller (hook) emits. Keep the parameter for the documented API.

- [ ] **Step 5: PASS + commit**

```bash
npx jest __tests__/services/DeckSyncService.test.ts
npm run typecheck && npm test
git add src/core/services/DeckSyncService.ts \
        __tests__/services/DeckSyncService.test.ts \
        __tests__/helpers/MockAppMetaStore.ts
git commit -m "feat(sync): DeckSyncService orchestrator (push then pull, paginated)"
```

---

## Task 13: Wire DeckSyncService into createAppServices

**Files:**
- Modify: `src/core/services/createAppServices.ts`

- [ ] **Step 1: Add wiring**

In `src/core/services/createAppServices.ts`, add imports:

```ts
import { SqliteAppMetaRepository } from "@/src/core/repositories/sqlite/SqliteAppMetaRepository";
import { SupabaseDeckGateway } from "@/src/core/repositories/supabase/SupabaseDeckGateway";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { DeckSyncService } from "@/src/core/services/DeckSyncService";
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";
```

Within `createAppServices()`, after `deckRepository` and `authService` exist (and after `supabaseClient` is fetched — reuse the existing variable from the billing wiring):

```ts
const appMeta = new SqliteAppMetaRepository();
const deckSyncService = supabaseClient
  ? (() => {
      const remoteDeckGateway = new SupabaseDeckGateway(supabaseClient);
      const worker = new PendingSyncWorker(deckRepository, remoteDeckGateway, authService);
      const merger = new DeckSyncMerger(deckRepository);
      return new DeckSyncService({
        worker,
        merger,
        remote: remoteDeckGateway,
        auth: authService,
        appMeta,
      });
    })()
  : null;
```

Add `deckSyncService` to the returned services object (it can be `null` in env-less builds).

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/services/createAppServices.ts
git commit -m "feat(sync): wire DeckSyncService in createAppServices"
```

---

## Task 14: Auto-trigger sync on bootstrap

**Files:**
- Modify: `src/app/bootstrap/AppBootstrapGate.tsx`

- [ ] **Step 1: Trigger after bootstrap completes**

In `AppBootstrapGate.tsx`, find the destructure of `useAppServices()` and add `deckSyncService`. After the existing bootstrap chain — after `setState("ready")` succeeds — fire the sync silently. Modify the existing `useEffect` block. The simplest pattern is to add another effect that watches `state`:

```tsx
const { bootstrapService, authService, deckSyncService } = useAppServices();
// ...existing useEffect for bootstrap...

useEffect(() => {
  if (state !== "ready") return;
  if (!deckSyncService) return;
  void deckSyncService.syncAsync({ trigger: "bootstrap" }).catch(() => {
    // silent — analytics + UI update will surface in profile screen
  });
}, [state, deckSyncService]);
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/bootstrap/AppBootstrapGate.tsx
git commit -m "feat(sync): auto-trigger deck sync after bootstrap"
```

---

## Task 15: useDeckSync hook

**Files:**
- Create: `src/features/profile/hooks/useDeckSync.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export function useDeckSync() {
  const { deckSyncService } = useAppServices();
  const queryClient = useQueryClient();

  const sync = useMutation({
    mutationFn: async () => {
      if (!deckSyncService) throw new Error("deckSyncService unavailable");
      return deckSyncService.syncAsync({ trigger: "manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });

  return { sync };
}

export function useFailedDeckOpsCount() {
  const { deckRepository } = useAppServices() as unknown as {
    deckRepository: { countFailedDeckOpsAsync(): Promise<number> };
  };
  return useQuery({
    queryKey: ["deckSync", "failedCount"],
    queryFn: () => deckRepository.countFailedDeckOpsAsync(),
    enabled: !!deckRepository,
    staleTime: 30_000,
  });
}
```

> If the project doesn't expose `deckRepository` on `useAppServices()`, expose it (one-line change in `createAppServices`'s return + AppServices type). Inspect first; the simplest is to add `deckRepository` to the returned services object alongside other repositories.

If exposing the repo on services feels too intrusive, an alternative is to pull the count via a service method — for now, expose `deckRepository`.

- [ ] **Step 2: Confirm `deckRepository` is on services**

Open `src/core/services/createAppServices.ts`. If `deckRepository` is NOT in the returned object, add it:

```ts
return {
  // ...existing,
  deckRepository,
  deckSyncService,
};
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/hooks/useDeckSync.ts \
        src/core/services/createAppServices.ts
git commit -m "feat(sync): useDeckSync hook + expose deckRepository"
```

---

## Task 16: SyncStatusCard component

**Files:**
- Create: `src/features/profile/components/SyncStatusCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/features/profile/components/SyncStatusCard.tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { useDeckSync, useFailedDeckOpsCount } from "@/src/features/profile/hooks/useDeckSync";
import { useT, useFormat } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";
import { useToast } from "@/src/shared/ui/toast";

export function SyncStatusCard() {
  const { t } = useT();
  const { colors } = useTheme();
  const { sync } = useDeckSync();
  const { data: failedCount = 0, refetch: refetchFailed } = useFailedDeckOpsCount();
  const toast = useToast();
  const services = useAppServices();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const { relativeTime } = useFormat();

  useEffect(() => {
    if (!("deckRepository" in services)) return;
    // Pull last_pulled_at via the appMeta wrapper; expose it through deckSyncService if not already.
    // Simpler: read from a cached SQLite query — keep last_pulled_at via app_meta directly.
    // For first cut, just track in component state after a successful sync.
  }, [services]);

  const onPress = async () => {
    try {
      const result = await sync.mutateAsync();
      setLastSyncedAt(new Date().toISOString());
      void refetchFailed();
      if (result.pushed === 0 && result.pulled === 0) {
        toast.show(t("deckSync.toastNoChanges"));
      } else {
        toast.show(t("deckSync.toastSuccess"));
      }
    } catch {
      // surfaces via global error handler
    }
  };

  const lastSyncLabel = lastSyncedAt
    ? t("deckSync.lastSyncedAt", { time: relativeTime(lastSyncedAt) })
    : t("deckSync.never");

  return (
    <Panel>
      <Text style={[styles.title, { color: colors.ink }]}>{t("deckSync.title")}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{lastSyncLabel}</Text>
      <View style={styles.action}>
        <AppButton onPress={onPress} disabled={sync.isPending}>
          {sync.isPending ? t("deckSync.syncing") : t("deckSync.button")}
        </AppButton>
      </View>
      {failedCount > 0 ? (
        <View style={styles.failedRow}>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("deckSync.failedItems", { count: failedCount })}
          </Text>
          <AppButton variant="secondary" onPress={onPress} disabled={sync.isPending}>
            {t("deckSync.retry")}
          </AppButton>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  title: { ...tokens.typography.heading },
  body: { ...tokens.typography.body },
  action: { marginTop: tokens.spacing.s },
  failedRow: {
    marginTop: tokens.spacing.s,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.s,
  },
});
```

> Notes:
> - `useFormat` returns formatters; verify the actual API by reading `src/shared/i18n/hooks/useFormat.ts`. If the helper isn't `relativeTime` but `relativeTimeFormat` or similar, adjust.
> - The component intentionally tracks `lastSyncedAt` in component state for v1 — true persistence reads `app_meta` via a separate query in a future iteration. This satisfies the spec's "마지막 sync 시각 표시" without an extra repo method.
> - Toast import path: `@/src/shared/ui/toast` matches existing usage.

- [ ] **Step 2: If `useFormat` lacks `relativeTime`, adjust**

```bash
sed -n '1,40p' src/shared/i18n/hooks/useFormat.ts
```

Use the actual exported helper. If the hook does not provide a relative formatter at all, replace the `relativeTime` line with `new Date(lastSyncedAt).toLocaleString()` as a v1 fallback (still acceptable for the spec).

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/SyncStatusCard.tsx
git commit -m "feat(profile): SyncStatusCard with manual sync and failed-items hint"
```

---

## Task 17: Render SyncStatusCard in ProfileScreen

**Files:**
- Modify: `src/features/profile/screens/ProfileScreen.tsx`

- [ ] **Step 1: Add import + render**

Add import:
```tsx
import { SyncStatusCard } from "@/src/features/profile/components/SyncStatusCard";
```

Place `<SyncStatusCard />` just below `<AccountLinkCard />` (and above the existing Sync boundary status / Restore panels).

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/screens/ProfileScreen.tsx
git commit -m "feat(profile): show SyncStatusCard"
```

---

## Task 18: Final verification

- [ ] **Step 1: Full pass**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: ALL PASS.

- [ ] **Step 2: External setup checklist (for the user)**

> Phase 2 코드 완료. 사용자 직접 수행:
> 1. Supabase 마이그레이션 적용:
>    `supabase db push` 또는 SQL Editor에서 `202604280002_phase2_deck_sync.sql` 실행
> 2. 적용 후 대시보드에서 `user_decks`, `user_deck_cards` 테이블 + RLS 정책 + 트리거 4종 (`user_decks_lww`, `user_deck_cards_lww`, `user_deck_cards_touch_parent`) 확인
> 3. 두 기기에서 같은 Google 계정 로그인 → 한쪽에서 deck 만들고 "지금 동기화" → 다른 기기에서 "지금 동기화" → 새 deck 등장 확인
> 4. 오프라인 모드에서 deck 수정 → 큐에 쌓이는지 SQLite 직접 확인 (`pending_sync_operations`) → 온라인 복귀 후 "지금 동기화"로 flush

---

## Self-Review (performed by author)

**Spec coverage:**
- 사용자 콘텐츠 양방향 sync → Tasks 4–13 ✓
- LWW 충돌 해결 → Task 1 (DB 트리거) + Task 11 (클라이언트 머지) ✓
- 트리거: 부트스트랩 1회 + 명시적 버튼 → Tasks 14, 16 ✓
- 카드 이미지 제외 → Task 8 (mergeRemoteDeckIntoTx에서 image_uri = NULL), Task 9 (enqueue payload에서 imageUri 제거), Task 1 (server schema에 image 컬럼 없음) ✓
- Soft delete → Tasks 1, 8, 9 ✓
- 기존 큐 활용 + 워커 → Tasks 9, 10 ✓
- 증분 pull (`updated_after`) → Tasks 5, 12 ✓
- Push → Pull 순서 → Task 12 (DeckSyncService.syncAsync) ✓
- 200개 페이징 → Task 5 (limit param) + Task 12 (페이징 루프) ✓
- 백오프 + 영구 실패 → Task 10 ✓
- `app_meta`에 last_pulled_at 저장 → Task 3 + Task 12 ✓
- DB 트리거로 stale push 무시 → Task 1 ✓
- 카드 변경 시 부모 deck touch 트리거 → Task 1 ✓
- 사용자 콘텐츠는 클라이언트 직접 쓰기 (RLS) → Task 1 (RLS 정책) + Task 5 (Supabase JS 직접 호출) ✓
- analytics 이벤트 3종 → Task 2 ✓
- i18n 키 4 locale → Task 2 ✓
- SyncStatusCard UI → Tasks 16, 17 ✓
- 실패 항목 표시 + 재시도 → Tasks 7 (countFailedDeckOpsAsync), 16 ✓
- 익명 사용자 코드 분기 없음 (RLS가 자연 차단) → Task 14 (env-less에선 deckSyncService === null로 폴백) ✓
- Push 시 큐 행 DELETE / 영구 실패 보존 → Task 10 ✓
- 멱등 UPSERT → Task 5 ✓

**Placeholder scan:** All steps include actual code blocks. Notes flagged in Task 16 ("verify useFormat API") and Task 13 ("reuse existing supabaseClient variable") are guidance for adapter shape variance, not vague TODOs.

**Type consistency:**
- `RemoteDeckPayload` from Task 4 used identically in Tasks 5, 8, 10, 11, 12 (mocks).
- `DeckRepository` extended in Task 6 — new methods used in Tasks 7, 8, 10, 11, 15.
- `PendingDeckOp` from Task 6 used in Task 7 (impl) and Task 10 (test fixtures).
- `MergeResult` / `FlushResult` / `DeckSyncResult` types appear once each in Tasks 11/10/12 respectively, no cross-confusion.
- `SyncTrigger` from Task 12 used in Task 14 (`{ trigger: "bootstrap" }`) and Task 15 hook (`{ trigger: "manual" }`).
- `LAST_PULLED_KEY = "deck_sync.last_pulled_at"` consistent across tasks 12, 16 (referenced in spec).

Two intentional deferred details:
- `useFormat` exact relative-time helper name — Task 16 step 2 inspects.
- `deckRepository` exposure on services — Task 15 step 2 ensures.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-phase2-deck-sync.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
