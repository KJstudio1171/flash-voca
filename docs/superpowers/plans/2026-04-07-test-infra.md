# Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jest 테스트 인프라를 구축하고 `StudySessionService`의 단위 테스트 10개를 작성하여 테스트 패턴을 확립한다.

**Architecture:** jest-expo 프리셋으로 Jest를 설정하고, 인터페이스 기반 수동 mock과 팩토리 함수를 `__tests__/helpers/`에 구성한다. `StudySessionService`의 due 계산, mastery 판정, snapshot 조합 로직을 단위 테스트로 검증한다.

**Tech Stack:** Jest, jest-expo, TypeScript

---

## File Structure

| File | Responsibility |
|------|---------------|
| Create: `jest.config.ts` | Jest 설정 (프리셋, path alias, testMatch) |
| Create: `__tests__/helpers/factories.ts` | mock 데이터 팩토리 함수 (Deck, DeckCard, DeckDetail, UserCardState, LogReviewInput) |
| Create: `__tests__/helpers/mockRepositories.ts` | DeckRepository, StudyRepository mock 생성 헬퍼 |
| Create: `__tests__/services/StudySessionService.test.ts` | StudySessionService 단위 테스트 10개 |
| Modify: `package.json` | devDependencies 추가, test/test:watch 스크립트 추가 |
| Modify: `CLAUDE.md` | 테스트 명령어, 컨벤션, verification checklist 업데이트 |

---

### Task 1: Jest 설치 및 설정

**Files:**
- Modify: `package.json`
- Create: `jest.config.ts`

- [ ] **Step 1: Install jest-expo and @types/jest**

```bash
npm install --save-dev jest-expo @types/jest
```

- [ ] **Step 2: Add test scripts to package.json**

`package.json`의 `"scripts"` 섹션에 추가:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit",
    "lint": "expo lint",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 3: Create jest.config.ts**

Create `jest.config.ts` at project root:

```ts
import type { Config } from "jest";

const config: Config = {
  preset: "jest-expo/ios",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
```

- [ ] **Step 4: Verify Jest runs (no tests yet)**

```bash
npm test
```

Expected: `No tests found` (not an error — Jest runs successfully but finds no test files).

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts package.json package-lock.json
git commit -m "chore: add jest with jest-expo preset"
```

---

### Task 2: Factory Functions

**Files:**
- Create: `__tests__/helpers/factories.ts`

- [ ] **Step 1: Create factories.ts with all factory functions**

Create `__tests__/helpers/factories.ts`:

```ts
import type {
  Deck,
  DeckCard,
  DeckDetail,
  LogReviewInput,
  UserCardState,
} from "@/src/core/domain/models";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `mock-${counter}`;
}

export function createMockDeck(overrides?: Partial<Deck>): Deck {
  const id = overrides?.id ?? nextId();
  return {
    id,
    title: `Deck ${id}`,
    description: null,
    sourceType: "user",
    ownerId: "local-user",
    accentColor: "#6366F1",
    cardCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockDeckCard(overrides?: Partial<DeckCard>): DeckCard {
  const id = overrides?.id ?? nextId();
  return {
    id,
    deckId: "deck-1",
    term: `term-${id}`,
    meaning: `meaning-${id}`,
    example: null,
    note: null,
    position: 0,
    ...overrides,
  };
}

export function createMockDeckDetail(
  overrides?: Partial<DeckDetail>,
): DeckDetail {
  const base = createMockDeck(overrides);
  return {
    ...base,
    cards: overrides?.cards ?? [],
    cardCount: overrides?.cardCount ?? (overrides?.cards?.length ?? 0),
  };
}

export function createMockCardState(
  overrides?: Partial<UserCardState>,
): UserCardState {
  const id = overrides?.id ?? nextId();
  return {
    id,
    deckId: "deck-1",
    cardId: "card-1",
    userId: "local-user",
    masteryLevel: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockLogReviewInput(
  overrides?: Partial<LogReviewInput>,
): LogReviewInput {
  return {
    deckId: "deck-1",
    cardId: "card-1",
    rating: 3,
    elapsedMs: 2000,
    ...overrides,
  };
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add __tests__/helpers/factories.ts
git commit -m "test: add mock data factory functions"
```

---

### Task 3: Mock Repositories

**Files:**
- Create: `__tests__/helpers/mockRepositories.ts`

- [ ] **Step 1: Create mockRepositories.ts**

Create `__tests__/helpers/mockRepositories.ts`:

```ts
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";

export function createMockDeckRepository(
  overrides?: Partial<DeckRepository>,
): DeckRepository {
  return {
    listDecksAsync: jest.fn().mockResolvedValue([]),
    getDeckByIdAsync: jest.fn().mockResolvedValue(null),
    saveDeckAsync: jest.fn(),
    deleteDeckAsync: jest.fn(),
    ...overrides,
  };
}

export function createMockStudyRepository(
  overrides?: Partial<StudyRepository>,
): StudyRepository {
  return {
    listCardStatesAsync: jest.fn().mockResolvedValue([]),
    logReviewAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add __tests__/helpers/mockRepositories.ts
git commit -m "test: add mock repository helpers"
```

---

### Task 4: StudySessionService Tests — listDeckSummariesAsync

**Files:**
- Create: `__tests__/services/StudySessionService.test.ts`

**Context:** `StudySessionService.listDeckSummariesAsync` logic:
- Gets all decks via `deckRepository.listDecksAsync()`
- For each deck, gets card states via `studyRepository.listCardStatesAsync(deckId, userId)`
- `notDueCount` = states where `nextReviewAt` exists AND is in the future
- `dueCount` = `deck.cardCount - notDueCount`
- `masteredCount` = states where `masteryLevel >= 3`

- [ ] **Step 1: Write all 5 listDeckSummariesAsync tests**

Create `__tests__/services/StudySessionService.test.ts`:

```ts
import { StudySessionService } from "@/src/core/services/StudySessionService";
import {
  createMockCardState,
  createMockDeck,
} from "@/__tests__/helpers/factories";
import {
  createMockDeckRepository,
  createMockStudyRepository,
} from "@/__tests__/helpers/mockRepositories";

describe("StudySessionService", () => {
  describe("listDeckSummariesAsync", () => {
    it("returns empty array when no decks exist", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.listDeckSummariesAsync();

      expect(result).toEqual([]);
    });

    it("counts all cards as due when no card states exist", async () => {
      const deck = createMockDeck({ id: "d1", cardCount: 5 });
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.listDeckSummariesAsync();

      expect(result).toHaveLength(1);
      expect(result[0].dueCount).toBe(5);
      expect(result[0].masteredCount).toBe(0);
    });

    it("excludes cards with future nextReviewAt from due count", async () => {
      const deck = createMockDeck({ id: "d1", cardCount: 3 });
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      const pastDate = new Date(Date.now() - 86_400_000).toISOString();
      const states = [
        createMockCardState({ cardId: "c1", deckId: "d1", nextReviewAt: futureDate }),
        createMockCardState({ cardId: "c2", deckId: "d1", nextReviewAt: pastDate }),
        createMockCardState({ cardId: "c3", deckId: "d1", nextReviewAt: null }),
      ];
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.listDeckSummariesAsync();

      // 1 future card is not due; cardCount(3) - notDue(1) = 2
      expect(result[0].dueCount).toBe(2);
    });

    it("counts cards with masteryLevel >= 3 as mastered", async () => {
      const deck = createMockDeck({ id: "d1", cardCount: 4 });
      const states = [
        createMockCardState({ cardId: "c1", deckId: "d1", masteryLevel: 3 }),
        createMockCardState({ cardId: "c2", deckId: "d1", masteryLevel: 5 }),
        createMockCardState({ cardId: "c3", deckId: "d1", masteryLevel: 2 }),
        createMockCardState({ cardId: "c4", deckId: "d1", masteryLevel: 0 }),
      ];
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.listDeckSummariesAsync();

      expect(result[0].masteredCount).toBe(2);
    });

    it("computes summaries independently for multiple decks", async () => {
      const deck1 = createMockDeck({ id: "d1", cardCount: 2 });
      const deck2 = createMockDeck({ id: "d2", cardCount: 3 });
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck1, deck2]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockImplementation((deckId: string) => {
          if (deckId === "d1") {
            return Promise.resolve([
              createMockCardState({ cardId: "c1", deckId: "d1", nextReviewAt: futureDate, masteryLevel: 3 }),
            ]);
          }
          return Promise.resolve([]);
        }),
      });
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.listDeckSummariesAsync();

      expect(result).toHaveLength(2);
      // deck1: cardCount(2) - notDue(1) = 1 due, 1 mastered
      expect(result[0].dueCount).toBe(1);
      expect(result[0].masteredCount).toBe(1);
      // deck2: cardCount(3) - notDue(0) = 3 due, 0 mastered
      expect(result[1].dueCount).toBe(3);
      expect(result[1].masteredCount).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 5 tests passing.

- [ ] **Step 3: Commit**

```bash
git add __tests__/services/StudySessionService.test.ts
git commit -m "test: add listDeckSummariesAsync tests"
```

---

### Task 5: StudySessionService Tests — getSnapshotAsync

**Files:**
- Modify: `__tests__/services/StudySessionService.test.ts`

**Context:** `StudySessionService.getSnapshotAsync` logic:
- Gets deck detail via `deckRepository.getDeckByIdAsync(deckId)` and card states via `studyRepository.listCardStatesAsync(deckId, userId)` in parallel
- If no deck, returns `null`
- Maps card states by cardId, joins with deck cards (`state` is `null` if no matching state)
- `dueCount` = cards where `state` is null, OR `state.nextReviewAt` is null, OR `nextReviewAt <= Date.now()`
- `masteredCount` = cards where `(state?.masteryLevel ?? 0) >= 3`

- [ ] **Step 1: Add getSnapshotAsync tests**

Append inside the existing `describe("StudySessionService", ...)` block in `__tests__/services/StudySessionService.test.ts`:

```ts
  describe("getSnapshotAsync", () => {
    it("returns null when deck does not exist", async () => {
      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(null),
      });
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.getSnapshotAsync("nonexistent");

      expect(result).toBeNull();
    });

    it("maps card states to matching cards and leaves null for unmatched", async () => {
      const deck = createMockDeckDetail({
        id: "d1",
        cards: [
          createMockDeckCard({ id: "c1", deckId: "d1" }),
          createMockDeckCard({ id: "c2", deckId: "d1" }),
        ],
      });
      const states = [
        createMockCardState({ cardId: "c1", deckId: "d1", masteryLevel: 2 }),
      ];
      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(deck),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.getSnapshotAsync("d1");

      expect(result).not.toBeNull();
      expect(result!.cards).toHaveLength(2);
      expect(result!.cards[0].state).not.toBeNull();
      expect(result!.cards[0].state!.cardId).toBe("c1");
      expect(result!.cards[1].state).toBeNull();
    });

    it("computes dueCount correctly based on nextReviewAt", async () => {
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      const pastDate = new Date(Date.now() - 86_400_000).toISOString();
      const deck = createMockDeckDetail({
        id: "d1",
        cards: [
          createMockDeckCard({ id: "c1", deckId: "d1" }),
          createMockDeckCard({ id: "c2", deckId: "d1" }),
          createMockDeckCard({ id: "c3", deckId: "d1" }),
        ],
      });
      const states = [
        createMockCardState({ cardId: "c1", deckId: "d1", nextReviewAt: futureDate }),
        createMockCardState({ cardId: "c2", deckId: "d1", nextReviewAt: pastDate }),
        // c3 has no state → due
      ];
      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(deck),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.getSnapshotAsync("d1");

      // c1: future → not due; c2: past → due; c3: no state → due
      expect(result!.dueCount).toBe(2);
    });

    it("computes masteredCount correctly based on masteryLevel", async () => {
      const deck = createMockDeckDetail({
        id: "d1",
        cards: [
          createMockDeckCard({ id: "c1", deckId: "d1" }),
          createMockDeckCard({ id: "c2", deckId: "d1" }),
          createMockDeckCard({ id: "c3", deckId: "d1" }),
        ],
      });
      const states = [
        createMockCardState({ cardId: "c1", deckId: "d1", masteryLevel: 3 }),
        createMockCardState({ cardId: "c2", deckId: "d1", masteryLevel: 1 }),
        // c3 has no state → masteryLevel defaults to 0
      ];
      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(deck),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo);

      const result = await service.getSnapshotAsync("d1");

      expect(result!.masteredCount).toBe(1);
    });
  });
```

Note: This requires adding `createMockDeckCard` and `createMockDeckDetail` to the import at the top of the file:

```ts
import {
  createMockCardState,
  createMockDeck,
  createMockDeckCard,
  createMockDeckDetail,
} from "@/__tests__/helpers/factories";
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 9 tests passing (5 from Task 4 + 4 new).

- [ ] **Step 3: Commit**

```bash
git add __tests__/services/StudySessionService.test.ts
git commit -m "test: add getSnapshotAsync tests"
```

---

### Task 6: StudySessionService Tests — recordReviewAsync

**Files:**
- Modify: `__tests__/services/StudySessionService.test.ts`

- [ ] **Step 1: Add recordReviewAsync test**

Append inside the existing `describe("StudySessionService", ...)` block in `__tests__/services/StudySessionService.test.ts`:

```ts
  describe("recordReviewAsync", () => {
    it("delegates to studyRepository.logReviewAsync with correct arguments", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo);
      const input = createMockLogReviewInput({
        deckId: "d1",
        cardId: "c1",
        rating: 4,
        elapsedMs: 3000,
      });

      await service.recordReviewAsync(input, "test-user");

      expect(studyRepo.logReviewAsync).toHaveBeenCalledWith(input, "test-user");
      expect(studyRepo.logReviewAsync).toHaveBeenCalledTimes(1);
    });
  });
```

Note: This requires adding `createMockLogReviewInput` to the import:

```ts
import {
  createMockCardState,
  createMockDeck,
  createMockDeckCard,
  createMockDeckDetail,
  createMockLogReviewInput,
} from "@/__tests__/helpers/factories";
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 10 tests passing (9 + 1 new).

- [ ] **Step 3: Commit**

```bash
git add __tests__/services/StudySessionService.test.ts
git commit -m "test: add recordReviewAsync test"
```

---

### Task 7: CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update Commands section**

Replace the Commands section in `CLAUDE.md`:

```markdown
## Commands

\`\`\`bash
npm install            # install dependencies
npx expo start         # start Expo dev server
npx expo run:android   # build and run on Android
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint (eslint)
npm test               # jest 전체 실행
npm run test:watch     # jest watch 모드
npx jest path/to/test  # 단일 테스트 파일 실행
\`\`\`
```

Remove the line `No test runner is configured yet.`

- [ ] **Step 2: Add Testing section after Engineering rules**

Add new section to `CLAUDE.md`:

```markdown
## Testing

- Test files live in `__tests__/`, mirroring the source structure (`services/`, `repositories/`, etc.).
- Mock data: use factory functions in `__tests__/helpers/factories.ts`.
- Mock repositories: use helpers in `__tests__/helpers/mockRepositories.ts`.
- Service tests use interface-based manual mocks. Do not use `jest.mock()`.
```

- [ ] **Step 3: Update Verification checklist**

Replace the Verification checklist section:

```markdown
## Verification checklist

Before finishing work: run `npm run typecheck`, `npm run lint`, and `npm test`.
```

- [ ] **Step 4: Run all checks**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: All pass — typecheck clean, lint clean, 10 tests passing.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add test commands and conventions to CLAUDE.md"
```
