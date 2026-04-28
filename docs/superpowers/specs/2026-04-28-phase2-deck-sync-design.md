# Phase 2 — 사용자 콘텐츠 동기화 설계

작성일: 2026-04-28
상태: 설계 승인 대기
선행 단계: Phase 0 (인증), Phase 1 (결제 보안)

## 배경

flash-voca는 현재 사용자가 만든 deck/card가 모두 로컬 SQLite에만 저장됩니다. 기기 변경/재설치 시 데이터 손실 위험이 있고, 다중 기기 사용도 불가합니다. `pending_sync_operations` 큐와 `enqueuePendingSyncOperationAsync` 호출 코드는 이미 존재하지만, 큐를 실제로 처리하는 워커가 없어 데이터가 영원히 큐에만 쌓이는 상태입니다.

Phase 2는 이 인프라를 완성하여 **사용자가 만든 deck/card가 다른 기기에서도 보이도록** 합니다.

## 목표 / 비목표

### 목표
- 사용자 콘텐츠(`sourceType: 'user'`인 deck + 그 안의 cards)의 양방향 동기화
- 기기 변경 / 재설치 시 사용자 자산 보존
- 기존 `pending_sync_operations` 큐를 활용한 push 워커 구현
- 증분 pull (`updated_at > last_pulled_at`) 로 효율적 동기화
- LWW(Last-Write-Wins)로 자동 충돌 해결 — 사용자 노출 충돌 UI 없음

### 비목표 (Phase 2 범위 외)
- 공식 콘텐츠(`sourceType: 'official'`) — Phase 2b
- 카드 이미지 / 오디오 — Phase 2b
- SRS 상태 / `user_card_states` / `review_logs` — Phase 3
- Realtime 구독 (변경 즉시 반영) — 별도 후속
- 사용자에게 노출되는 충돌 해결 UI — LWW로 자동 처리
- 백그라운드 sync (앱이 background 일 때) — 후속
- 큐 garbage collection — 운영 단계
- iOS 백그라운드 fetch — Android-first 원칙

## 핵심 결정사항

| 결정 | 채택안 |
|---|---|
| 범위 | 사용자 콘텐츠 양방향 sync만 (이미지/SRS 제외) |
| 충돌 해결 | **Last-Write-Wins** (`updated_at` 비교) |
| 트리거 | **앱 시작 시 1회 자동 + 명시적 "지금 동기화" 버튼** (다중 자동 트리거는 후속) |
| 카드 이미지 | Phase 2 제외 (텍스트만) |
| 삭제 처리 | **Soft delete** (`deleted_at` 컬럼) |
| 큐 활용 | 기존 `pending_sync_operations` 그대로 + 워커 추가 |
| Pull 방식 | **증분 pull** (`updated_after` 타임스탬프, app_meta에 저장) |
| Push/Pull 순서 | **Push → Pull** (사용자의 최근 의도 우선) |

## 아키텍처

### 데이터 흐름

```
[앱 시작 / "지금 동기화" 버튼]
        │
        ▼
   ┌────────────────────────┐
   │ DeckSyncService        │
   │  syncAsync():          │
   │   1. push pending ops  │
   │   2. pull updated_after│
   └────────────────────────┘
        │                │
        ▼                ▼
   pending_sync_      Supabase
   operations         user_decks / user_deck_cards
   (로컬 큐)          (서버 truth, RLS: user_id = auth.uid())
        │                │
        ▼                ▼
   local_decks /     LWW 트리거: stale push 자동 무시
   local_deck_cards
```

### 신뢰 모델

Phase 1과 달리 **사용자 콘텐츠는 사용자 자신이 만든 것**이라 위변조 의심이 없습니다. 그래서:

- 클라이언트가 자기 행에 대해 INSERT/UPDATE/DELETE를 직접 수행 (RLS로 자기 user_id 행만)
- Edge Function 같은 중계 서버 불필요 — Supabase JS SDK 직접 호출
- `entitlements`처럼 service role만 쓸 수 있는 패턴이 아님

### 핵심 추상화 (4개)

| 영역 | 신규 | 위치 |
|---|---|---|
| `RemoteDeckGateway` | Supabase 사용자 deck/card CRUD 어댑터 | `src/core/repositories/contracts/RemoteDeckGateway.ts` + `supabase/SupabaseDeckGateway.ts` |
| `DeckSyncService` | push + pull 오케스트레이션 | `src/core/services/DeckSyncService.ts` |
| `PendingSyncWorker` | 큐 행을 RemoteDeckGateway로 flush | `src/core/services/PendingSyncWorker.ts` |
| `DeckSyncMerger` | 서버 받은 payload를 로컬에 머지 (LWW) | `src/core/services/DeckSyncMerger.ts` |

## 데이터 모델

### Supabase 신규 테이블 1: `user_decks`

```sql
CREATE TABLE user_decks (
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

CREATE INDEX idx_user_decks_user_updated ON user_decks(user_id, updated_at DESC);
CREATE INDEX idx_user_decks_user_deleted ON user_decks(user_id, deleted_at);
```

### Supabase 신규 테이블 2: `user_deck_cards`

```sql
CREATE TABLE user_deck_cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),  -- denormalized for RLS
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

CREATE INDEX idx_user_deck_cards_user_updated ON user_deck_cards(user_id, updated_at DESC);
CREATE INDEX idx_user_deck_cards_deck_position ON user_deck_cards(deck_id, position ASC);
```

`user_id`를 카드 테이블에도 반정규화한 이유: RLS 정책이 행마다 `auth.uid()`만 비교해서 인덱스로 빠르게 동작하기 위함.

`image_uri`는 **의도적으로 제외** (Phase 2b).

### RLS 정책

```sql
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
```

### LWW 보호 — DB 트리거

stale push가 더 최신 행을 덮어쓰지 않도록:

```sql
CREATE OR REPLACE FUNCTION reject_stale_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;  -- silently keep existing
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_decks_lww BEFORE UPDATE ON user_decks
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();
CREATE TRIGGER user_deck_cards_lww BEFORE UPDATE ON user_deck_cards
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();
```

### 카드 변경 시 부모 deck 자동 갱신 (pull 안전망)

```sql
CREATE OR REPLACE FUNCTION touch_parent_deck() RETURNS trigger AS $$
BEGIN
  UPDATE user_decks SET updated_at = NEW.updated_at WHERE id = NEW.deck_id
    AND updated_at < NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deck_cards_touch_parent
  AFTER INSERT OR UPDATE ON user_deck_cards
  FOR EACH ROW EXECUTE FUNCTION touch_parent_deck();
```

이 트리거로 카드만 수정되어도 다음 pull에서 부모 deck이 잡히고, 같이 카드들도 SELECT 됨.

### 로컬 SQLite 변경

기존 `local_decks`, `local_deck_cards`에 **새 컬럼 추가 없음**. 이미 `is_deleted`, `sync_state`, `last_synced_at`, `updated_at`이 있어 그대로 활용. 서버의 `deleted_at`은 로컬에서 `is_deleted=1`로 매핑.

`app_meta` 테이블에 마지막 pull 시각 저장:
- key: `deck_sync.last_pulled_at`
- value: ISO8601 timestamp 또는 null (첫 sync)

### Supabase 마이그레이션 파일

`supabase/migrations/202604280002_phase2_deck_sync.sql` — 위 두 테이블, RLS 정책, 두 트리거, 인덱스.

## Push 흐름

### `RemoteDeckGateway` 인터페이스

```ts
export interface RemoteDeckPayload {
  deck: {
    id: string; title: string; description: string | null;
    accentColor: string; visibility: "private" | "public";
    sourceLanguage: string; targetLanguage: string;
    deletedAt: string | null;
    createdAt: string; updatedAt: string;
  };
  cards: RemoteCardPayload[];
}

export interface RemoteCardPayload {
  id: string; deckId: string; term: string; meaning: string;
  pronunciation: string | null; partOfSpeech: string | null;
  difficulty: "easy" | "medium" | "hard";
  example: string | null; exampleTranslation: string | null;
  note: string | null; tags: string[];
  synonyms: string | null; antonyms: string | null;
  relatedExpressions: string | null; source: string | null;
  position: number;
  deletedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface RemoteDeckGateway {
  upsertDeckAsync(userId: string, payload: RemoteDeckPayload): Promise<void>;
  pullDecksUpdatedAfterAsync(
    userId: string,
    since: string | null,
  ): Promise<RemoteDeckPayload[]>;
}
```

### 워커 처리 단계

```
1. 큐 조회: status='pending' AND available_at <= now() AND entity_type='deck'
2. 각 행 순차 처리 (병렬 X — 같은 deck 충돌 방지):
   - status='processing'으로 마킹
   - payload 파싱
   - RemoteDeckGateway.upsertDeckAsync 호출
   - 성공 → 큐 행 DELETE + 로컬 deck.sync_state='synced'
   - 실패 → attempt_count++, available_at = now() + 백오프
            attempt_count >= 5 → status='failed' (재시도 stop)
```

### 백오프 정책

`available_at = now() + min(2 ** attempt_count * 30, 3600) seconds`
(30s, 60s, 120s, 240s, 480s, max 1h)

### 멱등성

`UPSERT` 자체가 멱등이라 부분 실패 시 재시도해도 안전. 트랜잭션 없음(deck row + cards rows 두 단계 upsert)이지만 같은 payload 재실행 시 결과 동일.

### `DeckRepository` 새 메서드 (push 지원)

```ts
listPendingDeckOpsAsync(): Promise<PendingDeckOp[]>;
markOpProcessingAsync(opId: string): Promise<void>;
deleteOpAsync(opId: string): Promise<void>;
markOpFailedAsync(opId: string, error: unknown): Promise<void>;
markDeckSyncedAsync(deckId: string): Promise<void>;
```

### 기존 enqueue 로직

`SqliteDeckRepository.saveDeckAsync` 와 `deleteDeckAsync` 가 이미 `enqueuePendingSyncOperationAsync` 호출 중. payload 형식이 위 `RemoteDeckPayload`와 일치하도록 구현 시점에 맞춤. 일치하지 않으면 기존 enqueue 코드 측을 조정 (도메인 모델에 가장 가깝게).

## Pull 흐름

### 단계

```
1. last_pulled_at 읽기 (app_meta)
2. RemoteDeckGateway.pullDecksUpdatedAfterAsync(userId, since)
   - SELECT user_decks WHERE user_id=auth.uid() AND updated_at > since
     ORDER BY updated_at ASC LIMIT 200
   - 같은 deck_ids로 user_deck_cards 일괄 조회
3. 메모리에서 deck별 카드 그룹핑 → RemoteDeckPayload[]
4. DeckSyncMerger.mergePulledAsync(payloads)
5. last_pulled_at 갱신 (배치의 max(updated_at))
6. 200개 가득이면 페이징 루프, 아니면 종료
```

### 머지 로직

```
for each payload:
  local = getDeckById(payload.deck.id)
  if !local                       → applyRemoteDeck (insert)
  elif local.updatedAt < server   → applyRemoteDeck (update, LWW)
  else                            → skip (로컬 더 최신)
```

`applyRemoteDeck`는 단일 SQLite 트랜잭션:
1. deck row UPSERT (`deletedAt` → `is_deleted = 1` 매핑)
2. 그 deck의 모든 cards 교체 (UPSERT + 누락분 DELETE 또는 한꺼번에 DELETE+INSERT)
3. `sync_state = 'synced'`, `last_synced_at = now()`

### `DeckRepository` 새 메서드 (pull 지원)

```ts
applyRemoteDeckAsync(payload: RemoteDeckPayload): Promise<void>;
```

### `app_meta` 헬퍼 (인라인 또는 별도 클래스)

```ts
interface AppMetaStore {
  getValueAsync(key: string): Promise<string | null>;
  setValueAsync(key: string, value: string): Promise<void>;
}
```

## UI

### 신규 컴포넌트: `SyncStatusCard`

`src/features/profile/components/SyncStatusCard.tsx`

```
┌─────────────────────────────────┐
│  콘텐츠 동기화                    │
│  마지막 동기화: 5분 전              │
│  [지금 동기화]                    │
│                                 │
│  ⚠ 동기화 실패한 항목 1개          │
│  [재시도]                        │
└─────────────────────────────────┘
```

- 마지막 sync 시각 (`useFormat`의 relativeTime)
- 진행 중일 때 ActivityIndicator + 라벨 변경
- `pending_sync_operations.status='failed'` 1개 이상이면 경고 + 재시도 버튼

### 자동 트리거

`AppBootstrapGate`에서 부트스트랩 완료 직후 1회 자동 호출. 실패는 사일런트 (사용자 화면 안 막음).

### 익명 사용자 처리

`authService.getState().kind` 가 `local-temp` / `anonymous` 일 때도 sync는 호출되지만, RLS 통과는 `auth.uid()`가 있을 때만 실제 동작. 코드 분기 없이 일관되게 호출.

## 에러 분류

기존 `SyncError` (NetworkError 카테고리) 재사용. 추가 분류 필요 없음.

i18n 메시지 보강:
- `errors.deckSync.push` — push 실패
- `errors.deckSync.pull` — pull 실패

## 분석 이벤트 추가

```ts
deck_sync_started:    { trigger: 'bootstrap' | 'manual' }
deck_sync_completed:  { pushed, pulled, durationMs }
deck_sync_failed:     { reason, stage: 'push' | 'pull' }
```

## i18n 키 (4 locale)

```
deckSync.title             "콘텐츠 동기화"
deckSync.lastSyncedAt      "마지막 동기화: {{time}}"
deckSync.never             "동기화한 적 없음"
deckSync.button            "지금 동기화"
deckSync.syncing           "동기화 중..."
deckSync.failedItems       "동기화 실패 항목: {{count}}개"
deckSync.retry             "재시도"
deckSync.toastSuccess      "동기화를 완료했어요."
deckSync.toastNoChanges    "변경된 내용이 없어요."
errors.deckSync.push       "변경 사항을 보내지 못했어요."
errors.deckSync.pull       "최신 데이터를 가져오지 못했어요."
```

## 테스트 전략

기존 패턴 준수: 수동 mock, 인터페이스 기반.

### 신규 Jest 테스트
- `__tests__/services/PendingSyncWorker.test.ts`
  - 큐 1개 → upsert 호출 → 큐 DELETE
  - upsert 실패 → attempt_count 증가, available_at 미래
  - attempt_count 5 도달 → status='failed'
  - 빈 큐 → no-op
  - 동일 deck 큐 행 2개 → 순차 처리
- `__tests__/services/DeckSyncMerger.test.ts`
  - 로컬 없음 → applyRemoteDeck
  - 로컬 < 서버 → apply
  - 로컬 >= 서버 → skip
  - deletedAt 있음 → soft delete 적용
- `__tests__/services/DeckSyncService.test.ts`
  - push 성공 → pull 호출 → merger 호출 순서
  - push 실패해도 pull 수행
  - last_pulled_at 갱신
  - 빈 응답 시 페이징 루프 종료

### Mock helpers
- `__tests__/helpers/MockRemoteDeckGateway.ts`
- `__tests__/helpers/createMockRemoteDeckPayload.ts`

### 기존 테스트 영향
- `SqliteDeckRepository` 테스트에 새 메서드(`listPendingDeckOpsAsync` 등) 단위 테스트 추가
- `enqueue` payload 형식이 `RemoteDeckPayload`와 일치하는지 검증

## 성공 기준 (Done)

1. ✅ `npm run typecheck`, `npm run lint`, `npm test` 모두 통과
2. ✅ `supabase/migrations/202604280002_phase2_deck_sync.sql` 추가
3. ✅ 마이그레이션 SQL `dry-run` 통과 (실 적용은 외부)
4. ✅ 프로필 화면 "지금 동기화" 버튼 동작 (mock + 실 환경)
5. ✅ 부트스트랩 시 자동 sync 1회 (실패는 사일런트)
6. ✅ 큐가 비어있으면 push skip, pull만 실행
7. ✅ 200개 페이징 루프 동작
8. ✅ 성공한 큐 행 DELETE, 실패 5회 도달한 행은 status='failed' 영구 보관

## 외부 작업 체크리스트

- [ ] Supabase 마이그레이션 적용:
  `supabase db push` 또는 SQL Editor에서 `202604280002_phase2_deck_sync.sql` 실행
- (Phase 0 / Phase 1 마이그레이션이 적용된 상태 가정)

## 수동 검증 시나리오

1. 기기 A에서 deck 1개 만들고 앱 종료
2. 기기 A 재시작 → 부트스트랩 sync로 서버에 push 됨 (Supabase 대시보드에서 확인)
3. 기기 B(다른 사용자가 아닌 같은 Google 계정으로 로그인) → pull로 그 deck 등장
4. 기기 A에서 카드 1장 추가 → "지금 동기화" → 서버 반영
5. 기기 B "지금 동기화" → 새 카드 등장
6. 기기 A에서 deck 삭제 → 동기화 → 기기 B에서 다음 sync 시 사라짐
7. 오프라인 상태에서 deck 수정 → 큐에 쌓임 → 온라인 복귀 후 다음 sync에서 push

## 후속 단계

- **Phase 1.5**: 환불 RTDN webhook
- **Phase 2b**: 유료 콘텐츠 서버 분리 + 카드 이미지 Storage
- **Phase 3**: SRS 상태 동기화 (필드별 머지 정책 검토)
