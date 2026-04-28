# Phase A — SRS Algorithm Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded `getNextReviewState` with an `SrsAlgorithm` abstraction, ship Leitner and SM-2 implementations, expand the in-app rating from 3 to 4 levels (again/hard/good/easy), and add an app-wide algorithm picker on the Settings screen.

**Architecture:** A pure-function `SrsAlgorithm` interface returns the next `CardSrsState` from the previous state plus a `ReviewInput`. Algorithm-specific data lives in a single new SQLite column (`algorithm_data TEXT`) as JSON. App-wide selection persists through the existing `app_meta` table via a new `SrsPreferenceService`.

**Tech Stack:** TypeScript, Expo 54 / RN, expo-sqlite, Jest.

**Spec:** `docs/superpowers/specs/2026-04-28-phaseA-srs-algorithms-design.md`

---

## File Structure

### New files
- `src/core/services/srs/SrsAlgorithm.ts` — interface + types
- `src/core/services/srs/LeitnerAlgorithm.ts`
- `src/core/services/srs/Sm2Algorithm.ts`
- `src/core/services/srs/srsAlgorithmRegistry.ts`
- `src/core/services/srs/SrsPreferenceService.ts`
- `src/core/services/srs/ratingCodec.ts`
- `src/features/settings/components/SrsAlgorithmPicker.tsx`
- `src/features/study/components/ReviewRatingButtons.tsx`
- `__tests__/services/srs/LeitnerAlgorithm.test.ts`
- `__tests__/services/srs/Sm2Algorithm.test.ts`
- `__tests__/services/srs/SrsPreferenceService.test.ts`
- `__tests__/helpers/MockSrsPreferenceService.ts`
- `__tests__/helpers/createMockCardSrsState.ts`

### Modified files
- `src/core/domain/models.ts` — `UserCardState.algorithmData`, `ReviewRating` type, `LogReviewInput.rating`
- `src/core/database/initialize.ts` — `algorithm_data` column migration (schema_version bump)
- `src/core/repositories/contracts/StudyRepository.ts` — `logReviewAsync` signature change
- `src/core/repositories/sqlite/SqliteStudyRepository.ts` — drop `getNextReviewState`, use `SrsAlgorithm`
- `src/core/services/StudySessionService.ts` — algorithm selection in `recordReviewAsync`
- `src/core/services/createAppServices.ts` — wire SrsPreferenceService + registry
- `src/core/observability/eventRegistry.ts` — `srs_*` events
- `src/shared/i18n/locales/{ko,en,ja,zh}.json` — `srs.*` namespace + `study.ratings.hard`
- `src/features/study/hooks/useStudySession.ts` — 4-rating support
- `src/features/study/components/SessionCompleteCard.tsx` — `hard` count
- `src/features/study/screens/StudyScreen.tsx` — render `ReviewRatingButtons`, label adjustments
- `app/settings/index.tsx` — render `SrsAlgorithmPicker`
- `__tests__/helpers/mockRepositories.ts` — `createMockStudyRepository` keeps existing signature

---

## Task 1: i18n keys + analytics events

**Files:**
- Modify: `src/shared/i18n/locales/{ko,en,ja,zh}.json`
- Modify: `src/core/observability/eventRegistry.ts`

- [ ] **Step 1: Add `srs` namespace + `study.ratings.hard` to ko.json**

Add a new top-level key `srs` (place after `deckSync` or another existing top-level key — verify order by reading the file first):

```json
"srs": {
  "algorithm": {
    "sectionTitle": "학습 알고리즘",
    "leitner": {
      "title": "Simple (Leitner)",
      "description": "5상자 시스템으로 직관적이고 빠름."
    },
    "sm2": {
      "title": "Standard (SM-2)",
      "description": "Anki와 같은 표준. 카드별 난이도를 자동 조정."
    },
    "changed": "{{name}}로 변경했어요."
  },
  "rating": {
    "again": "다시",
    "hard": "어려움",
    "good": "알맞음",
    "easy": "쉬움"
  }
}
```

Inside the existing `study.ratings` object (search for "ratings"), add:
```json
"hard": "어려움"
```
Final ratings: `again`, `hard`, `good`, `easy` (4 keys).

- [ ] **Step 2: Mirror in en.json**

`srs`:
```json
"srs": {
  "algorithm": {
    "sectionTitle": "Study algorithm",
    "leitner": {
      "title": "Simple (Leitner)",
      "description": "5-box system. Direct and quick."
    },
    "sm2": {
      "title": "Standard (SM-2)",
      "description": "Anki-style standard. Auto-tunes difficulty per card."
    },
    "changed": "Switched to {{name}}."
  },
  "rating": {
    "again": "Again",
    "hard": "Hard",
    "good": "Good",
    "easy": "Easy"
  }
}
```

`study.ratings.hard`: `"Hard"`.

- [ ] **Step 3: Mirror in ja.json**

`srs`:
```json
"srs": {
  "algorithm": {
    "sectionTitle": "学習アルゴリズム",
    "leitner": {
      "title": "Simple (Leitner)",
      "description": "5箱システム。直感的で速い。"
    },
    "sm2": {
      "title": "Standard (SM-2)",
      "description": "Anki風の標準。カードごとに難易度を自動調整。"
    },
    "changed": "{{name}}に変更しました。"
  },
  "rating": {
    "again": "もう一度",
    "hard": "難しい",
    "good": "ちょうど良い",
    "easy": "簡単"
  }
}
```

`study.ratings.hard`: `"難しい"`.

- [ ] **Step 4: Mirror in zh.json**

`srs`:
```json
"srs": {
  "algorithm": {
    "sectionTitle": "学习算法",
    "leitner": {
      "title": "Simple (Leitner)",
      "description": "5箱系统。直观快速。"
    },
    "sm2": {
      "title": "Standard (SM-2)",
      "description": "类似 Anki 的标准。按卡片自动调整难度。"
    },
    "changed": "已切换为 {{name}}。"
  },
  "rating": {
    "again": "再来",
    "hard": "困难",
    "good": "良好",
    "easy": "简单"
  }
}
```

`study.ratings.hard`: `"困难"`.

- [ ] **Step 5: Add events to src/core/observability/eventRegistry.ts**

Append before the closing `} satisfies` of `analyticsEventRegistry`:

```ts
  srs_algorithm_changed: { allowedProps: ["from", "to"] as const },
  srs_review_recorded: { allowedProps: ["algorithmId", "rating"] as const },
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck
node -e "for (const f of ['ko','en','ja','zh']) JSON.parse(require('fs').readFileSync(\`src/shared/i18n/locales/\${f}.json\`,'utf8'))"
```
Expected: PASS, JSON valid.

- [ ] **Step 7: Commit**

```bash
git add src/shared/i18n/locales/ src/core/observability/eventRegistry.ts
git commit -m "feat(i18n,observability): add srs namespace, study.ratings.hard, srs events"
```

---

## Task 2: ReviewRating type + ratingCodec

**Files:**
- Create: `src/core/services/srs/ratingCodec.ts`
- Modify: `src/core/domain/models.ts`

- [ ] **Step 1: Define ReviewRating + add algorithmData/rating to domain models**

Read `src/core/domain/models.ts` to find `UserCardState` and `LogReviewInput`. Then:

Add near the top of the file (or near other unions):
```ts
export type ReviewRating = "again" | "hard" | "good" | "easy";
```

In `UserCardState` interface, add:
```ts
algorithmData: Record<string, unknown>;
```
(place after `isBookmarked` or before `updatedAt`)

In `LogReviewInput`, change `rating` field:
```ts
// before:  rating: number;
rating: ReviewRating;
```

- [ ] **Step 2: Create src/core/services/srs/ratingCodec.ts**

```ts
import type { ReviewRating } from "@/src/core/domain/models";

export const ratingToInt: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

const intToRatingMap: Record<number, ReviewRating> = {
  0: "again", // legacy fallback
  1: "again",
  2: "hard",
  3: "good",
  4: "easy",
};

export function ratingFromInt(value: number): ReviewRating {
  return intToRatingMap[value] ?? "again";
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail in callers that pass numeric rating. We address those in Task 12 (StudyRepository) and Task 14 (useStudySession). Continue without committing — combine commit later.

- [ ] **Step 4: Defer commit until Task 12**

---

## Task 3: SrsAlgorithm interface + types

**Files:**
- Create: `src/core/services/srs/SrsAlgorithm.ts`

- [ ] **Step 1: Write the file**

```ts
import type { ReviewRating } from "@/src/core/domain/models";

export type SrsAlgorithmId = "leitner" | "sm2";

export interface ReviewInput {
  rating: ReviewRating;
  reviewedAt: string;        // ISO8601
  elapsedMs: number;
}

export interface CardSrsState {
  masteryLevel: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  algorithmData: Record<string, unknown>;
}

export interface SrsAlgorithm {
  readonly id: SrsAlgorithmId;
  computeNextState(prev: CardSrsState, input: ReviewInput): CardSrsState;
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/services/srs/SrsAlgorithm.ts
git commit -m "feat(srs): SrsAlgorithm contract"
```

---

## Task 4: LeitnerAlgorithm (TDD)

**Files:**
- Create: `src/core/services/srs/LeitnerAlgorithm.ts`
- Create: `__tests__/services/srs/LeitnerAlgorithm.test.ts`
- Create: `__tests__/helpers/createMockCardSrsState.ts`

- [ ] **Step 1: Mock helper**

```ts
// __tests__/helpers/createMockCardSrsState.ts
import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";

export function createMockCardSrsState(
  overrides: Partial<CardSrsState> = {},
): CardSrsState {
  return {
    masteryLevel: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    algorithmData: {},
    ...overrides,
  };
}
```

- [ ] **Step 2: Write failing tests**

```ts
// __tests__/services/srs/LeitnerAlgorithm.test.ts
import { LeitnerAlgorithm } from "@/src/core/services/srs/LeitnerAlgorithm";
import { createMockCardSrsState } from "@/__tests__/helpers/createMockCardSrsState";

const REVIEWED_AT = "2026-04-28T00:00:00.000Z";
const algo = new LeitnerAlgorithm();

function dayDiff(a: string, b: string) {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400_000);
}

describe("LeitnerAlgorithm", () => {
  it("again from any box sends to box 1, interval 1", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { box: 4 } }),
      { rating: "again", reviewedAt: REVIEWED_AT, elapsedMs: 1000 },
    );
    expect((next.algorithmData as { box: number }).box).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(dayDiff(next.nextReviewAt!, REVIEWED_AT)).toBe(1);
  });

  it("good promotes one box, capped at 5", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { box: 5 } }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect((next.algorithmData as { box: number }).box).toBe(5);
    expect(next.intervalDays).toBe(14);
  });

  it("good from box 3 -> box 4, interval 8", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { box: 3 } }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect((next.algorithmData as { box: number }).box).toBe(4);
    expect(next.intervalDays).toBe(8);
  });

  it("easy from box 1 -> box 3, interval 4", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { box: 1 } }),
      { rating: "easy", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect((next.algorithmData as { box: number }).box).toBe(3);
    expect(next.intervalDays).toBe(4);
  });

  it("hard from box 1 stays at box 1 (floor)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { box: 1 } }),
      { rating: "hard", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect((next.algorithmData as { box: number }).box).toBe(1);
    expect(next.intervalDays).toBe(1);
  });

  it("seeds box from masteryLevel when algorithmData empty", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ masteryLevel: 2, algorithmData: {} }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    // seed: mastery 2 -> box 3 -> good -> box 4
    expect((next.algorithmData as { box: number }).box).toBe(4);
  });

  it("syncs masteryLevel from box (box - 1, clamped 0..4)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { box: 5 } }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.masteryLevel).toBe(4);
  });
});
```

- [ ] **Step 3: Run — FAIL**

```bash
npx jest __tests__/services/srs/LeitnerAlgorithm.test.ts
```
Expected: module not found.

- [ ] **Step 4: Implement**

```ts
// src/core/services/srs/LeitnerAlgorithm.ts
import type {
  CardSrsState,
  ReviewInput,
  SrsAlgorithm,
} from "@/src/core/services/srs/SrsAlgorithm";

const BOX_INTERVALS: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 8, 5: 14,
};

function clampBox(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, value)) as 1 | 2 | 3 | 4 | 5;
}

function readSeedBox(prev: CardSrsState): 1 | 2 | 3 | 4 | 5 {
  const stored = (prev.algorithmData as { box?: number }).box;
  if (stored === 1 || stored === 2 || stored === 3 || stored === 4 || stored === 5) {
    return stored;
  }
  return clampBox(prev.masteryLevel + 1);
}

export class LeitnerAlgorithm implements SrsAlgorithm {
  readonly id = "leitner" as const;

  computeNextState(prev: CardSrsState, input: ReviewInput): CardSrsState {
    const seedBox = readSeedBox(prev);
    let nextBox: 1 | 2 | 3 | 4 | 5;
    switch (input.rating) {
      case "again":
        nextBox = 1;
        break;
      case "hard":
        nextBox = clampBox(seedBox - 1);
        break;
      case "good":
        nextBox = clampBox(seedBox + 1);
        break;
      case "easy":
        nextBox = clampBox(seedBox + 2);
        break;
    }
    const intervalDays = BOX_INTERVALS[nextBox];
    const nextReviewAt = new Date(
      new Date(input.reviewedAt).getTime() + intervalDays * 86400_000,
    ).toISOString();
    return {
      masteryLevel: Math.max(0, Math.min(4, nextBox - 1)),
      easeFactor: prev.easeFactor || 2.5,
      intervalDays,
      nextReviewAt,
      lastReviewedAt: input.reviewedAt,
      algorithmData: { box: nextBox },
    };
  }
}
```

- [ ] **Step 5: Run — PASS**

```bash
npx jest __tests__/services/srs/LeitnerAlgorithm.test.ts
```
Expected: 7 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/services/srs/LeitnerAlgorithm.ts \
        __tests__/services/srs/LeitnerAlgorithm.test.ts \
        __tests__/helpers/createMockCardSrsState.ts
git commit -m "feat(srs): Leitner algorithm with 5-box intervals"
```

---

## Task 5: Sm2Algorithm (TDD)

**Files:**
- Create: `src/core/services/srs/Sm2Algorithm.ts`
- Create: `__tests__/services/srs/Sm2Algorithm.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/services/srs/Sm2Algorithm.test.ts
import { Sm2Algorithm } from "@/src/core/services/srs/Sm2Algorithm";
import { createMockCardSrsState } from "@/__tests__/helpers/createMockCardSrsState";

const REVIEWED_AT = "2026-04-28T00:00:00.000Z";
const algo = new Sm2Algorithm();

describe("Sm2Algorithm", () => {
  it("first review good -> 1d, repetitions 1", () => {
    const next = algo.computeNextState(
      createMockCardSrsState(),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(1);
    expect((next.algorithmData as { repetitions: number }).repetitions).toBe(1);
  });

  it("first review easy -> 4d", () => {
    const next = algo.computeNextState(
      createMockCardSrsState(),
      { rating: "easy", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(4);
  });

  it("first review again -> 1d, repetitions stays 0", () => {
    const next = algo.computeNextState(
      createMockCardSrsState(),
      { rating: "again", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(1);
    expect((next.algorithmData as { repetitions: number }).repetitions).toBe(0);
    expect((next.algorithmData as { lapses: number }).lapses).toBe(1);
  });

  it("second review good -> 6d", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { repetitions: 1, lapses: 0 }, intervalDays: 1 }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(6);
  });

  it("third+ review good -> prev * ease", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 5, lapses: 0 },
        intervalDays: 10,
        easeFactor: 2.5,
      }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(25);   // round(10 * 2.5)
  });

  it("again resets repetitions and decreases ease (floor 1.3)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 3, lapses: 0 },
        intervalDays: 30,
        easeFactor: 1.4,
      }),
      { rating: "again", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect((next.algorithmData as { repetitions: number }).repetitions).toBe(0);
    expect((next.algorithmData as { lapses: number }).lapses).toBe(1);
    expect(next.easeFactor).toBe(1.3);
    expect(next.intervalDays).toBe(1);
  });

  it("easy increases ease by 0.15", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 5, lapses: 0 },
        intervalDays: 10,
        easeFactor: 2.5,
      }),
      { rating: "easy", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.easeFactor).toBeCloseTo(2.65, 2);
    expect(next.intervalDays).toBe(33); // round(10 * 2.5 * 1.3)
  });

  it("hard decreases ease by 0.15 and applies x1.2 interval (rep>=1)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 3, lapses: 0 },
        intervalDays: 10,
        easeFactor: 2.5,
      }),
      { rating: "hard", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.easeFactor).toBeCloseTo(2.35, 2);
    expect(next.intervalDays).toBe(12); // round(10 * 1.2)
  });

  it("syncs masteryLevel from min(4, repetitions)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: { repetitions: 7, lapses: 0 }, intervalDays: 30 }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.masteryLevel).toBe(4);
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
npx jest __tests__/services/srs/Sm2Algorithm.test.ts
```
Expected: module not found.

- [ ] **Step 3: Implement**

```ts
// src/core/services/srs/Sm2Algorithm.ts
import type {
  CardSrsState,
  ReviewInput,
  SrsAlgorithm,
} from "@/src/core/services/srs/SrsAlgorithm";

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

interface Sm2Data {
  repetitions: number;
  lapses: number;
}

function readSm2(prev: CardSrsState): Sm2Data {
  const data = prev.algorithmData as { repetitions?: number; lapses?: number };
  return {
    repetitions: typeof data.repetitions === "number" ? data.repetitions : 0,
    lapses: typeof data.lapses === "number" ? data.lapses : 0,
  };
}

export class Sm2Algorithm implements SrsAlgorithm {
  readonly id = "sm2" as const;

  computeNextState(prev: CardSrsState, input: ReviewInput): CardSrsState {
    const { repetitions, lapses } = readSm2(prev);
    const prevEase = prev.easeFactor && prev.easeFactor > 0 ? prev.easeFactor : DEFAULT_EASE;
    const prevInterval = prev.intervalDays || 0;

    let nextRepetitions = repetitions;
    let nextLapses = lapses;
    let nextEase = prevEase;
    let intervalDays: number;

    switch (input.rating) {
      case "again":
        nextRepetitions = 0;
        nextLapses = lapses + 1;
        nextEase = Math.max(MIN_EASE, prevEase - 0.20);
        intervalDays = 1;
        break;
      case "hard":
        nextRepetitions = repetitions + 1;
        nextEase = Math.max(MIN_EASE, prevEase - 0.15);
        intervalDays =
          repetitions === 0 ? 1 : Math.max(1, Math.round(prevInterval * 1.2));
        break;
      case "good":
        nextRepetitions = repetitions + 1;
        if (repetitions === 0) intervalDays = 1;
        else if (repetitions === 1) intervalDays = 6;
        else intervalDays = Math.max(1, Math.round(prevInterval * prevEase));
        break;
      case "easy":
        nextRepetitions = repetitions + 1;
        nextEase = prevEase + 0.15;
        if (repetitions === 0) intervalDays = 4;
        else if (repetitions === 1) intervalDays = 6;
        else
          intervalDays = Math.max(1, Math.round(prevInterval * prevEase * 1.3));
        break;
    }

    const nextReviewAt = new Date(
      new Date(input.reviewedAt).getTime() + intervalDays * 86400_000,
    ).toISOString();

    return {
      masteryLevel: Math.min(4, Math.max(0, nextRepetitions)),
      easeFactor: nextEase,
      intervalDays,
      nextReviewAt,
      lastReviewedAt: input.reviewedAt,
      algorithmData: { repetitions: nextRepetitions, lapses: nextLapses },
    };
  }
}
```

- [ ] **Step 4: Run — PASS**

```bash
npx jest __tests__/services/srs/Sm2Algorithm.test.ts
```
Expected: 9 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/services/srs/Sm2Algorithm.ts \
        __tests__/services/srs/Sm2Algorithm.test.ts
git commit -m "feat(srs): SM-2 algorithm with dynamic ease and exponential intervals"
```

---

## Task 6: Algorithm registry

**Files:**
- Create: `src/core/services/srs/srsAlgorithmRegistry.ts`

- [ ] **Step 1: Write the registry**

```ts
import { LeitnerAlgorithm } from "@/src/core/services/srs/LeitnerAlgorithm";
import { Sm2Algorithm } from "@/src/core/services/srs/Sm2Algorithm";
import type {
  SrsAlgorithm,
  SrsAlgorithmId,
} from "@/src/core/services/srs/SrsAlgorithm";

const REGISTRY: Record<SrsAlgorithmId, SrsAlgorithm> = {
  leitner: new LeitnerAlgorithm(),
  sm2: new Sm2Algorithm(),
};

export function getSrsAlgorithm(id: SrsAlgorithmId): SrsAlgorithm {
  return REGISTRY[id];
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck
git add src/core/services/srs/srsAlgorithmRegistry.ts
git commit -m "feat(srs): srsAlgorithmRegistry"
```

---

## Task 7: SrsPreferenceService (TDD)

**Files:**
- Create: `src/core/services/srs/SrsPreferenceService.ts`
- Create: `__tests__/services/srs/SrsPreferenceService.test.ts`
- Create: `__tests__/helpers/MockSrsPreferenceService.ts`

- [ ] **Step 1: Mock helper**

```ts
// __tests__/helpers/MockSrsPreferenceService.ts
import type { SrsAlgorithmId } from "@/src/core/services/srs/SrsAlgorithm";
import type { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";

export function createMockSrsPreferenceService(
  initial: SrsAlgorithmId = "leitner",
): SrsPreferenceService {
  let value: SrsAlgorithmId = initial;
  return {
    getAlgorithmAsync: jest.fn(async () => value),
    setAlgorithmAsync: jest.fn(async (id: SrsAlgorithmId) => {
      value = id;
    }),
  } as unknown as SrsPreferenceService;
}
```

- [ ] **Step 2: Write failing test**

```ts
// __tests__/services/srs/SrsPreferenceService.test.ts
import { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";
import { createMockAppMetaStore } from "@/__tests__/helpers/MockAppMetaStore";

describe("SrsPreferenceService", () => {
  it("returns leitner default when key absent", async () => {
    const meta = createMockAppMetaStore();
    const svc = new SrsPreferenceService(meta);
    expect(await svc.getAlgorithmAsync()).toBe("leitner");
  });

  it("persists and reads sm2", async () => {
    const meta = createMockAppMetaStore();
    const svc = new SrsPreferenceService(meta);
    await svc.setAlgorithmAsync("sm2");
    expect(await svc.getAlgorithmAsync()).toBe("sm2");
    expect(meta.setValueAsync).toHaveBeenCalledWith("srs.algorithm", "sm2");
  });

  it("falls back to leitner when stored value is unknown", async () => {
    const meta = createMockAppMetaStore({ "srs.algorithm": "fsrs" });
    const svc = new SrsPreferenceService(meta);
    expect(await svc.getAlgorithmAsync()).toBe("leitner");
  });
});
```

- [ ] **Step 3: Run — FAIL**

```bash
npx jest __tests__/services/srs/SrsPreferenceService.test.ts
```
Expected: module not found.

- [ ] **Step 4: Implement**

```ts
// src/core/services/srs/SrsPreferenceService.ts
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";
import type { SrsAlgorithmId } from "@/src/core/services/srs/SrsAlgorithm";

const KEY = "srs.algorithm";
const DEFAULT_ALGORITHM: SrsAlgorithmId = "leitner";

export class SrsPreferenceService {
  constructor(private readonly appMeta: AppMetaStore) {}

  async getAlgorithmAsync(): Promise<SrsAlgorithmId> {
    const raw = await this.appMeta.getValueAsync(KEY);
    if (raw === "leitner" || raw === "sm2") return raw;
    return DEFAULT_ALGORITHM;
  }

  async setAlgorithmAsync(id: SrsAlgorithmId): Promise<void> {
    await this.appMeta.setValueAsync(KEY, id);
  }
}
```

- [ ] **Step 5: Run — PASS, commit**

```bash
npx jest __tests__/services/srs/SrsPreferenceService.test.ts
git add src/core/services/srs/SrsPreferenceService.ts \
        __tests__/services/srs/SrsPreferenceService.test.ts \
        __tests__/helpers/MockSrsPreferenceService.ts
git commit -m "feat(srs): SrsPreferenceService backed by AppMetaStore"
```

---

## Task 8: SQLite migration — algorithm_data column

**Files:**
- Modify: `src/core/database/initialize.ts`
- Modify: `src/core/database/schema.ts`

- [ ] **Step 1: Read initialize.ts to find current schema_version**

```bash
sed -n '1,80p' src/core/database/initialize.ts
```

Find the `schema_version` constant or migration pattern. The Phase 1 migration bumped it from 5 → 6, Phase 2 added `play_product_id`. We follow the same `addColumnIfMissingAsync` style.

- [ ] **Step 2: Add migrateToVersion7Async**

Add a new function (modeled on existing `migrateToVersionN`):

```ts
async function migrateToVersion7Async(db: SQLiteDatabase): Promise<void> {
  await addColumnIfMissingAsync(
    db,
    "local_user_card_states",
    "algorithm_data",
    "TEXT NOT NULL DEFAULT '{}'",
  );
}
```

Wire it into the migration chain (locate where `migrateToVersion6Async` is called and add a `7` step after `6`). Bump the `LATEST_VERSION` constant to `7`.

- [ ] **Step 3: Update LOCAL_USER_CARD_STATES_TABLE_SQL in schema.ts**

In `src/core/database/schema.ts`, find `LOCAL_USER_CARD_STATES_TABLE_SQL` and add `algorithm_data TEXT NOT NULL DEFAULT '{}',` between `is_bookmarked` and `sync_state`:

```ts
export const LOCAL_USER_CARD_STATES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_user_card_states (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_reviewed_at TEXT,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  algorithm_data TEXT NOT NULL DEFAULT '{}',
  sync_state TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('failed', 'pending', 'synced')),
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(card_id, user_id),
  FOREIGN KEY(deck_id) REFERENCES local_decks(id) ON DELETE CASCADE,
  FOREIGN KEY(card_id) REFERENCES local_deck_cards(id) ON DELETE CASCADE
);
`;
```

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck && npm test
```
Expected: PASS.

```bash
git add src/core/database/initialize.ts src/core/database/schema.ts
git commit -m "feat(db): add local_user_card_states.algorithm_data column (v7)"
```

---

## Task 9: Update StudyRepository contract

**Files:**
- Modify: `src/core/repositories/contracts/StudyRepository.ts`
- Modify: `__tests__/helpers/mockRepositories.ts`

- [ ] **Step 1: Update contract to accept algorithm**

Replace `src/core/repositories/contracts/StudyRepository.ts` with:

```ts
import {
  HomeReviewStats,
  LogReviewInput,
  UserCardState,
} from "@/src/core/domain/models";
import type { SrsAlgorithm } from "@/src/core/services/srs/SrsAlgorithm";

export interface StudyRepository {
  listCardStatesAsync(deckId: string, userId: string): Promise<UserCardState[]>;
  getHomeReviewStatsAsync(userId: string): Promise<HomeReviewStats>;
  logReviewAsync(
    input: LogReviewInput,
    userId: string,
    algorithm: SrsAlgorithm,
  ): Promise<void>;
  setBookmarkAsync(
    input: { deckId: string; cardId: string; isBookmarked: boolean },
    userId: string,
  ): Promise<void>;
  undoLastReviewAsync(deckId: string, userId: string): Promise<boolean>;
}
```

- [ ] **Step 2: Update createMockStudyRepository default**

In `__tests__/helpers/mockRepositories.ts`, the existing mock returns `logReviewAsync: jest.fn().mockResolvedValue(undefined)` — that already accepts any args, so no change needed. Verify by reading.

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail in `SqliteStudyRepository.ts` and `StudySessionService.ts` until Tasks 10–11. Continue.

- [ ] **Step 4: Defer commit until Task 11**

---

## Task 10: SqliteStudyRepository — drop getNextReviewState, accept algorithm

**Files:**
- Modify: `src/core/repositories/sqlite/SqliteStudyRepository.ts`

- [ ] **Step 1: Read current file structure**

```bash
sed -n '1,260p' src/core/repositories/sqlite/SqliteStudyRepository.ts
```

Identify:
- `getNextReviewState` function (lines ~32–48) — DELETE
- `mapStateRow` (around line ~20) — needs to read `algorithm_data` column
- `logReviewAsync` (around line ~191) — uses `getNextReviewState` and `input.rating` (number) — needs full refactor

- [ ] **Step 2: Update mapStateRow to include algorithmData**

Find the function that maps a SQL row to `UserCardState` (`mapStateRow` or inline mapping). Add:
```ts
algorithmData: parseAlgorithmData(row.algorithmData),
```

Add a helper at the top of the file:
```ts
function parseAlgorithmData(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || raw.length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
```

- [ ] **Step 3: Refactor logReviewAsync to use SrsAlgorithm**

Locate the existing `logReviewAsync(input: LogReviewInput, userId: string)` (around line ~191). Replace its body to:
1. Take a third parameter `algorithm: SrsAlgorithm`
2. Build `prevState: CardSrsState` from the existing row (or zeros if no row)
3. Call `algorithm.computeNextState(prevState, { rating: input.rating, reviewedAt, elapsedMs: input.elapsedMs })`
4. Use `next.algorithmData` to UPSERT, store as `JSON.stringify(next.algorithmData)`
5. Use `ratingToInt[input.rating]` for the `rating` integer column

Outline (adapt to current SQL):

```ts
import { ratingToInt } from "@/src/core/services/srs/ratingCodec";
import type { SrsAlgorithm, CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";

async logReviewAsync(input: LogReviewInput, userId: string, algorithm: SrsAlgorithm) {
  const db = await getDatabaseAsync();
  const reviewedAt = new Date().toISOString();
  
  await db.withExclusiveTransactionAsync(async (tx) => {
    // 1. fetch existing card_state row (if any)
    const priorRow = await tx.getFirstAsync<{
      mastery_level: number;
      ease_factor: number;
      interval_days: number;
      next_review_at: string | null;
      last_reviewed_at: string | null;
      algorithm_data: string | null;
    }>(
      `SELECT mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at, algorithm_data
       FROM local_user_card_states
       WHERE card_id = ? AND user_id = ?;`,
      [input.cardId, userId],
    );
    
    const prevState: CardSrsState = {
      masteryLevel: Number(priorRow?.mastery_level ?? 0),
      easeFactor: Number(priorRow?.ease_factor ?? 2.5),
      intervalDays: Number(priorRow?.interval_days ?? 0),
      nextReviewAt: priorRow?.next_review_at ?? null,
      lastReviewedAt: priorRow?.last_reviewed_at ?? null,
      algorithmData: parseAlgorithmData(priorRow?.algorithm_data),
    };
    
    const next = algorithm.computeNextState(prevState, {
      rating: input.rating,
      reviewedAt,
      elapsedMs: input.elapsedMs,
    });
    
    const stateId = createId("ucs");
    const now = reviewedAt;
    
    // 2. UPSERT card_state
    await tx.runAsync(
      `INSERT INTO local_user_card_states (
        id, deck_id, card_id, user_id, mastery_level, ease_factor, interval_days,
        next_review_at, last_reviewed_at, is_bookmarked, algorithm_data,
        sync_state, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', NULL, ?, ?)
      ON CONFLICT(card_id, user_id) DO UPDATE SET
        mastery_level = excluded.mastery_level,
        ease_factor = excluded.ease_factor,
        interval_days = excluded.interval_days,
        next_review_at = excluded.next_review_at,
        last_reviewed_at = excluded.last_reviewed_at,
        algorithm_data = excluded.algorithm_data,
        sync_state = 'pending',
        last_synced_at = NULL,
        updated_at = excluded.updated_at;`,
      [
        stateId,
        input.deckId,
        input.cardId,
        userId,
        next.masteryLevel,
        next.easeFactor,
        next.intervalDays,
        next.nextReviewAt,
        next.lastReviewedAt,
        JSON.stringify(next.algorithmData),
        now,
        now,
      ],
    );
    
    // 3. INSERT review_log (rating as int)
    await tx.runAsync(
      `INSERT INTO local_review_logs (
        id, deck_id, card_id, user_id, rating, elapsed_ms, reviewed_at,
        sync_state, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL);`,
      [
        createId("rlog"),
        input.deckId,
        input.cardId,
        userId,
        ratingToInt[input.rating],
        input.elapsedMs,
        reviewedAt,
      ],
    );
  });
}
```

> Read the original `logReviewAsync` body to see if there's enqueue logic (`enqueuePendingSyncOperationAsync`) currently called — if so, preserve it (the spec doesn't change sync queue semantics).

- [ ] **Step 4: Update undoLastReviewAsync to also use algorithm**

Find `undoLastReviewAsync` (around line ~544). It also calls `getNextReviewState`. Replace that section so it:
- Reads the previous review_log to recover the rating
- Uses the algorithm's reverse logic — **but algorithms aren't reversible.** Simpler approach: re-run all preceding reviews from start. Even simpler: keep the snapshot approach — when logging a review, also store the *prior* state somewhere (e.g., in review_logs as a JSON column). The minimal Phase A change is: take an `algorithm` parameter (typically passed by the caller) but in undo we just remove the last review log and reset card_state to all-zero or to the most recent surviving log's prior state.

For Phase A, **simplify undo behavior**: undo deletes the most recent review_log AND resets the affected card_state to `algorithm_data='{}'`, `mastery_level=0`, `interval_days=0`, `next_review_at=NULL`, `last_reviewed_at=NULL`. This is a documented behavior change — undo no longer perfectly reverts but it matches the simpler model and is rarely used.

Add to method signature: `undoLastReviewAsync(deckId: string, userId: string, algorithm: SrsAlgorithm): Promise<boolean>` — though `algorithm` isn't strictly needed here, keep parameter for future flexibility. (Or omit — if not strictly needed, do not propagate.)

> If propagating `algorithm` increases the touch surface significantly, prefer **not** to add it to undo. Instead reset to defaults. Final decision: **omit the algorithm parameter from `undoLastReviewAsync`**, simplify the body to do a delete + reset.

Replace the contract entry in Task 9 to keep `undoLastReviewAsync(deckId, userId)` unchanged — only `logReviewAsync` gets the new signature.

- [ ] **Step 5: Defer commit until Task 11**

---

## Task 11: StudySessionService — select algorithm + commit Tasks 9–11

**Files:**
- Modify: `src/core/services/StudySessionService.ts`

- [ ] **Step 1: Inject SrsPreferenceService**

Read `StudySessionService` constructor. Add a third parameter:

```ts
import type { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";
import { getSrsAlgorithm } from "@/src/core/services/srs/srsAlgorithmRegistry";

constructor(
  private readonly deckRepository: DeckRepository,
  private readonly studyRepository: StudyRepository,
  private readonly auth: AuthService,
  private readonly srsPreferenceService: SrsPreferenceService,
) {}
```

- [ ] **Step 2: Update recordReviewAsync**

Find `recordReviewAsync(input: LogReviewInput, userId?: string)` and modify:

```ts
async recordReviewAsync(input: LogReviewInput, userId?: string) {
  const id = userId ?? this.auth.getCurrentUserId();
  const algorithmId = await this.srsPreferenceService.getAlgorithmAsync();
  const algorithm = getSrsAlgorithm(algorithmId);
  return this.studyRepository.logReviewAsync(input, id, algorithm);
}
```

- [ ] **Step 3: Verify and commit Tasks 9–11**

```bash
npm run typecheck && npm test
```

Tests will fail in places that pass numeric rating (Task 14 will fix `useStudySession`). For now, fix any **server-side test** breakage by passing `ReviewRating` strings in fixtures. UI tests will be updated in Task 14.

```bash
git add src/core/repositories/contracts/StudyRepository.ts \
        src/core/repositories/sqlite/SqliteStudyRepository.ts \
        src/core/services/StudySessionService.ts \
        src/core/domain/models.ts \
        src/core/services/srs/ratingCodec.ts \
        __tests__/
git commit -m "refactor(srs): use SrsAlgorithm in logReviewAsync; ReviewRating enum"
```

---

## Task 12: Wire SrsPreferenceService into createAppServices

**Files:**
- Modify: `src/core/services/createAppServices.ts`

- [ ] **Step 1: Add wiring**

In `src/core/services/createAppServices.ts`:

```ts
import { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";
```

Inside `createAppServices()`, after `appMeta` exists (Phase 2 added `const appMeta = new SqliteAppMetaRepository();`):

```ts
const srsPreferenceService = new SrsPreferenceService(appMeta);
```

Pass to `StudySessionService`:

```ts
studySessionService: new StudySessionService(
  deckRepository,
  studyRepository,
  authService,
  srsPreferenceService,
),
```

Add to returned services:
```ts
return {
  // ...existing,
  srsPreferenceService,
};
```

- [ ] **Step 2: Verify and commit**

```bash
npm run typecheck && npm test
```

```bash
git add src/core/services/createAppServices.ts
git commit -m "feat(srs): wire SrsPreferenceService in createAppServices"
```

---

## Task 13: Update useStudySession to support 4 ratings

**Files:**
- Modify: `src/features/study/hooks/useStudySession.ts`

- [ ] **Step 1: Replace StudyRating type with ReviewRating import**

Update imports:
```ts
import { LogReviewInput, ReviewRating, StudyCard } from "@/src/core/domain/models";
```

Remove the local `type StudyRating = 1 | 2 | 3;` line. Replace usages with `ReviewRating`.

- [ ] **Step 2: Update ratingCounts to include hard**

Change initial state and reset:
```ts
const [ratingCounts, setRatingCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

const restartSession = useCallback(() => {
  // ...existing
  setRatingCounts({ again: 0, hard: 0, good: 0, easy: 0 });
}, []);
```

- [ ] **Step 3: Update rateCard to use enum**

```ts
const rateCard = useCallback(
  (rating: ReviewRating) => {
    const activeCard = cards[currentIndex];
    if (!activeCard || actionLockRef.current) return;

    actionLockRef.current = true;
    setIsTransitioning(true);
    actionHistoryRef.current.push({ type: "rating", index: currentIndex, rating });

    setRatingCounts((prev) => ({
      again: rating === "again" ? prev.again + 1 : prev.again,
      hard: rating === "hard" ? prev.hard + 1 : prev.hard,
      good: rating === "good" ? prev.good + 1 : prev.good,
      easy: rating === "easy" ? prev.easy + 1 : prev.easy,
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
```

Update `StudySessionAction` type:
```ts
type StudySessionAction =
  | { type: "rating"; index: number; rating: ReviewRating }
  | { type: "skip"; index: number };
```

- [ ] **Step 4: Update undoLastRatedCard counter decrement**

```ts
setRatingCounts((prev) => ({
  again: ratingAction.rating === "again" ? Math.max(0, prev.again - 1) : prev.again,
  hard: ratingAction.rating === "hard" ? Math.max(0, prev.hard - 1) : prev.hard,
  good: ratingAction.rating === "good" ? Math.max(0, prev.good - 1) : prev.good,
  easy: ratingAction.rating === "easy" ? Math.max(0, prev.easy - 1) : prev.easy,
}));
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm test
```

UI tests using ratingCounts may need updating — check tests under `__tests__/features/study/`.

- [ ] **Step 6: Commit**

```bash
git add src/features/study/hooks/useStudySession.ts __tests__/
git commit -m "feat(study): expand ratings to 4 levels (again/hard/good/easy)"
```

---

## Task 14: SessionCompleteCard — show hard count

**Files:**
- Modify: `src/features/study/components/SessionCompleteCard.tsx`

- [ ] **Step 1: Read current file**

```bash
sed -n '1,120p' src/features/study/components/SessionCompleteCard.tsx
```

- [ ] **Step 2: Update RatingCounts type and rendering**

Find the `RatingCounts` type in the file (or a shared location). Update to include `hard`:

```ts
type RatingCounts = { again: number; hard: number; good: number; easy: number };
```

In the JSX where `again/good/easy` counts are displayed (around line ~75–89), add a fourth item for `hard`. Use `t("srs.rating.hard")` or `t("study.ratings.hard")` — pick whichever namespace is consistently used in this file.

If the file uses a 3-column layout, change to 4-column or stack `hard` below.

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/study/components/SessionCompleteCard.tsx
git commit -m "feat(study): show hard count on SessionCompleteCard"
```

---

## Task 15: ReviewRatingButtons component

**Files:**
- Create: `src/features/study/components/ReviewRatingButtons.tsx`

- [ ] **Step 1: Read AppButton + colors tokens**

```bash
sed -n '1,50p' src/shared/ui/AppButton.tsx
sed -n '1,80p' src/shared/theme/tokens.ts
```

Note actual exported `colors` keys (e.g., `danger`, `warning`, `success`, `primary`, `accent`). If a name doesn't exist, fall back to a literal hex.

- [ ] **Step 2: Write the component**

```tsx
// src/features/study/components/ReviewRatingButtons.tsx
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import type { ReviewRating } from "@/src/core/domain/models";
import { getSrsAlgorithm } from "@/src/core/services/srs/srsAlgorithmRegistry";
import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

interface Props {
  cardState: CardSrsState;
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

const ORDER: ReviewRating[] = ["again", "hard", "good", "easy"];

export function ReviewRatingButtons({ cardState, onRate, disabled }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const { srsPreferenceService } = useAppServices();

  const { data: algoId = "leitner" } = useQuery({
    queryKey: ["srs", "algorithm"],
    queryFn: () => srsPreferenceService.getAlgorithmAsync(),
  });

  const algorithm = getSrsAlgorithm(algoId);

  const previews = useMemo(() => {
    const now = new Date().toISOString();
    return ORDER.map((rating) => {
      const next = algorithm.computeNextState(cardState, {
        rating,
        reviewedAt: now,
        elapsedMs: 0,
      });
      return { rating, intervalDays: next.intervalDays };
    });
  }, [algorithm, cardState]);

  const colorByRating: Record<ReviewRating, string> = {
    again: (colors as Record<string, string>).danger ?? "#DC2626",
    hard: (colors as Record<string, string>).warning ?? "#D97706",
    good: colors.primary,
    easy: (colors as Record<string, string>).success ?? "#16A34A",
  };

  return (
    <View style={styles.row}>
      {previews.map((p) => (
        <Pressable
          key={p.rating}
          onPress={() => onRate(p.rating)}
          disabled={disabled}
          style={[
            styles.btn,
            { backgroundColor: colorByRating[p.rating], opacity: disabled ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.label}>{t(`srs.rating.${p.rating}`)}</Text>
          <Text style={styles.interval}>{formatInterval(p.intervalDays)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function formatInterval(days: number): string {
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: tokens.spacing.m,
    paddingHorizontal: tokens.spacing.s,
    borderRadius: tokens.radius.m ?? tokens.radius.l,
    alignItems: "center",
    gap: 2,
  },
  label: { color: "#fff", fontWeight: "600", ...tokens.typography.body },
  interval: { color: "#fff", opacity: 0.85, fontSize: 12 },
});
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/study/components/ReviewRatingButtons.tsx
git commit -m "feat(study): ReviewRatingButtons with 4 buttons and interval preview"
```

---

## Task 16: Integrate ReviewRatingButtons into StudyScreen

**Files:**
- Modify: `src/features/study/screens/StudyScreen.tsx`

- [ ] **Step 1: Read StudyScreen to find where current rating UI lives**

```bash
sed -n '1,200p' src/features/study/screens/StudyScreen.tsx
```

Note the surrounding component, the variable that holds the current card state, and how `rateCard` is invoked.

- [ ] **Step 2: Replace existing rating UI with ReviewRatingButtons**

Add import:
```tsx
import { ReviewRatingButtons } from "@/src/features/study/components/ReviewRatingButtons";
```

Where the current rating buttons / swipe affordance lives, render:
```tsx
<ReviewRatingButtons
  cardState={{
    masteryLevel: currentCard.state?.masteryLevel ?? 0,
    easeFactor: currentCard.state?.easeFactor ?? 2.5,
    intervalDays: currentCard.state?.intervalDays ?? 0,
    nextReviewAt: currentCard.state?.nextReviewAt ?? null,
    lastReviewedAt: currentCard.state?.lastReviewedAt ?? null,
    algorithmData: currentCard.state?.algorithmData ?? {},
  }}
  onRate={session.rateCard}
  disabled={session.isTransitioning}
/>
```

> The current screen may use `SwipeStudyCard` for gestures. **Phase A: keep gestures in place AND add the 4-button bar** below the card. If a swipe is bound to `again/good`, that's fine — it's a UX subset. We don't remove swipe in Phase A.

- [ ] **Step 3: Update label imports for hard if used inline**

If the file reads `study.ratings` keys to build a labels map (around line 165–170), add `hard`:
```ts
{
  again: t("study.ratings.again"),
  hard: t("study.ratings.hard"),
  good: t("study.ratings.good"),
  easy: t("study.ratings.easy"),
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/study/screens/StudyScreen.tsx
git commit -m "feat(study): render ReviewRatingButtons on StudyScreen"
```

---

## Task 17: SrsAlgorithmPicker + Settings integration

**Files:**
- Create: `src/features/settings/components/SrsAlgorithmPicker.tsx`
- Modify: `app/settings/index.tsx`

- [ ] **Step 1: Write the picker**

```tsx
// src/features/settings/components/SrsAlgorithmPicker.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import type { SrsAlgorithmId } from "@/src/core/services/srs/SrsAlgorithm";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { useToast } from "@/src/shared/ui/toast";

const OPTIONS: SrsAlgorithmId[] = ["leitner", "sm2"];

export function SrsAlgorithmPicker() {
  const { t } = useT();
  const { colors } = useTheme();
  const { srsPreferenceService } = useAppServices();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: current = "leitner" } = useQuery({
    queryKey: ["srs", "algorithm"],
    queryFn: () => srsPreferenceService.getAlgorithmAsync(),
  });

  const setAlgo = useMutation({
    mutationFn: (id: SrsAlgorithmId) => srsPreferenceService.setAlgorithmAsync(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["srs", "algorithm"] });
      toast.show(
        t("srs.algorithm.changed", { name: t(`srs.algorithm.${id}.title`) }),
      );
    },
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>
        {t("srs.algorithm.sectionTitle")}
      </Text>
      {OPTIONS.map((id) => {
        const selected = current === id;
        return (
          <Pressable
            key={id}
            onPress={() => setAlgo.mutate(id)}
            disabled={setAlgo.isPending}
            style={[
              styles.option,
              {
                borderColor: selected ? colors.primary : colors.line,
                backgroundColor: selected
                  ? (colors as Record<string, string>).primarySoft ?? colors.surface
                  : colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.radio,
                { borderColor: selected ? colors.primary : colors.muted },
              ]}
            >
              {selected ? (
                <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
              ) : null}
            </View>
            <View style={styles.optionBody}>
              <Text style={[styles.optionTitle, { color: colors.ink }]}>
                {t(`srs.algorithm.${id}.title`)}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.muted }]}>
                {t(`srs.algorithm.${id}.description`)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.spacing.s },
  sectionTitle: { ...tokens.typography.heading, marginBottom: tokens.spacing.s },
  option: {
    flexDirection: "row",
    gap: tokens.spacing.m,
    padding: tokens.spacing.m,
    borderRadius: tokens.radius.l,
    borderWidth: tokens.borderWidth.hairline,
    alignItems: "center",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionBody: { flex: 1, gap: 4 },
  optionTitle: { ...tokens.typography.body, fontWeight: "600" },
  optionDesc: { ...tokens.typography.body, fontSize: 13 },
});
```

- [ ] **Step 2: Render in settings screen**

Read `app/settings/index.tsx` to find where existing settings sections live. Add an import:
```tsx
import { SrsAlgorithmPicker } from "@/src/features/settings/components/SrsAlgorithmPicker";
```

Render `<SrsAlgorithmPicker />` near other study-related settings (search for "study" or near a `Panel`).

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/features/settings/components/SrsAlgorithmPicker.tsx app/settings/index.tsx
git commit -m "feat(settings): add SrsAlgorithmPicker"
```

---

## Task 18: Final verification

- [ ] **Step 1: Full pass**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: ALL PASS.

- [ ] **Step 2: grep for legacy artifacts**

```bash
grep -rn "getNextReviewState" src/ __tests__/
```
Expected: 0 matches.

```bash
grep -n "rating: number\|rating === 1\|rating === 2\|rating === 3" src/features/study/
```
Expected: 0 matches (all migrated to enum).

- [ ] **Step 3: External setup checklist**

> Phase A 코드 완료. 외부 작업 **없음** (순수 클라이언트 변경).
> 수동 검증:
> 1. 앱 시작 → 설정 → "학습 알고리즘"에 Leitner / SM-2 옵션 표시
> 2. 두 옵션 전환해보고 토스트 확인
> 3. 학습 화면 진입 → 4버튼 (다시/어려움/알맞음/쉬움) + 각 버튼에 다음 간격 미리보기
> 4. 카드 학습 후 알고리즘 변경 → 다음 카드부터 새 알고리즘 적용 확인 (간격 변화)
> 5. 기존 학습 데이터로 첫 review 시 에러 없이 진행

---

## Self-Review (performed by author)

**Spec coverage:**
- `SrsAlgorithm` interface + types → Task 3 ✓
- Leitner 구현 + 7 테스트 → Task 4 ✓
- SM-2 구현 + 9 테스트 → Task 5 ✓
- Algorithm registry → Task 6 ✓
- SrsPreferenceService + 3 테스트 → Task 7 ✓
- algorithm_data 컬럼 마이그레이션 → Task 8 ✓
- ReviewRating enum + ratingCodec → Task 2 ✓
- StudyRepository contract 변경 → Task 9 ✓
- SqliteStudyRepository drop getNextReviewState → Task 10 ✓
- StudySessionService 알고리즘 선택 → Task 11 ✓
- createAppServices 와이어링 → Task 12 ✓
- useStudySession 4-rating 지원 → Task 13 ✓
- SessionCompleteCard hard count → Task 14 ✓
- ReviewRatingButtons (4버튼 + 간격 preview) → Task 15 ✓
- StudyScreen 통합 → Task 16 ✓
- SrsAlgorithmPicker + Settings → Task 17 ✓
- i18n 4 locale + analytics → Task 1 ✓
- 자연 흡수 (별도 마이그레이션 없음) → Task 4 (LeitnerAlgorithm.readSeedBox), Task 5 (Sm2Algorithm.readSm2 default 0) ✓
- 호환성 (mastery_level/interval_days 유지) → Task 4/5 (각 알고리즘이 출력) ✓
- `getNextReviewState` 완전 제거 → Task 10, Task 18 grep 검증 ✓

**Placeholder scan:** All steps have actual code. The "verify by reading file first" notes are guards for adapter shape variance, not vague TODOs.

**Type consistency:**
- `ReviewRating` from Task 2 used in Tasks 3, 4, 5, 13, 14, 15, 16
- `CardSrsState` from Task 3 used in Tasks 4, 5, 10, 15
- `SrsAlgorithm` from Task 3 used in Tasks 6, 9, 10, 11
- `SrsAlgorithmId` from Task 3 used in Tasks 6, 7, 17
- `algorithm_data` column from Task 8 read by Task 10's `parseAlgorithmData`
- `srsPreferenceService` exposed in Task 12, used by Tasks 11, 15, 17

Two intentional deferred details:
- Color tokens (`danger`/`warning`/`success`/`primarySoft`) — Task 15/17 fall back to literal hex if absent
- StudyScreen current UI structure — Task 16 inspects file before editing

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-phaseA-srs-algorithms.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
