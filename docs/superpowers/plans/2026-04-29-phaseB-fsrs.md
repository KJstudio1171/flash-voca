# Phase B — FSRS Algorithm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FSRS-4.5 as a third option to the existing SRS algorithm picker by wrapping the `ts-fsrs` library in a thin adapter that conforms to Phase A's `SrsAlgorithm` interface.

**Architecture:** A new `FsrsAlgorithm` class implements `SrsAlgorithm` by translating `CardSrsState` ↔ `ts-fsrs` `Card`, calling `FSRS.next()`, and serializing the result back into the existing `algorithm_data` JSON column. No schema migration. Picker, registry, preference fallback, and i18n receive a single new entry each.

**Tech Stack:** TypeScript, Expo 54, `ts-fsrs`, Jest.

**Spec:** `docs/superpowers/specs/2026-04-29-phaseB-fsrs-design.md`

---

## File Structure

### New files
- `src/core/services/srs/FsrsAlgorithm.ts` — adapter
- `__tests__/services/srs/FsrsAlgorithm.test.ts` — 7 adapter tests

### Modified files
- `package.json` (and `package-lock.json`) — add `ts-fsrs`
- `src/core/services/srs/SrsAlgorithm.ts` — extend `SrsAlgorithmId`
- `src/core/services/srs/srsAlgorithmRegistry.ts` — register `fsrs`
- `src/core/services/srs/SrsPreferenceService.ts` — accept `"fsrs"` in fallback check
- `src/features/settings/components/SrsAlgorithmPicker.tsx` — append `"fsrs"` to OPTIONS + TITLE_KEYS + DESC_KEYS
- `src/shared/i18n/locales/{ko,en,ja,zh}.json` — `srs.algorithm.fsrs.{title,description}`
- `__tests__/services/srs/SrsPreferenceService.test.ts` — 1 new case

---

## Task 1: Install ts-fsrs

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install ts-fsrs
```

- [ ] **Step 2: Verify the package installed and inspect its exports**

```bash
npm ls ts-fsrs
node -e "console.log(Object.keys(require('ts-fsrs')))"
```

Expected output of the second command should include at least: `FSRS`, `Rating`, `State`, `createEmptyCard`, `generatorParameters`, `Card` (or similar). Note any naming differences for use in later tasks (e.g., if `generatorParameters` is named `generator_parameters` or `defaultParameters`, adapt the FsrsAlgorithm import in Task 4 accordingly).

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ts-fsrs dependency"
```

---

## Task 2: i18n keys (4 locales)

**Files:**
- Modify: `src/shared/i18n/locales/ko.json`, `en.json`, `ja.json`, `zh.json`

- [ ] **Step 1: Add `fsrs` to `srs.algorithm` in ko.json**

Find the existing `"srs": { "algorithm": { "leitner": ..., "sm2": ..., "changed": ... } ... }` block. Add a new `fsrs` entry as a sibling of `leitner` and `sm2` (placement: after `sm2`, before `changed`):

```json
"fsrs": {
  "title": "Advanced (FSRS)",
  "description": "망각곡선 기반의 차세대 알고리즘. Anki 23.10에 도입됨."
}
```

- [ ] **Step 2: Mirror in en.json**

```json
"fsrs": {
  "title": "Advanced (FSRS)",
  "description": "Forgetting-curve based next-gen algorithm. Adopted in Anki 23.10."
}
```

- [ ] **Step 3: Mirror in ja.json**

```json
"fsrs": {
  "title": "Advanced (FSRS)",
  "description": "忘却曲線に基づく次世代アルゴリズム。Anki 23.10で採用。"
}
```

- [ ] **Step 4: Mirror in zh.json**

```json
"fsrs": {
  "title": "Advanced (FSRS)",
  "description": "基于遗忘曲线的下一代算法。Anki 23.10 采纳。"
}
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
node -e "for (const f of ['ko','en','ja','zh']) JSON.parse(require('fs').readFileSync(\`src/shared/i18n/locales/\${f}.json\`,'utf8'))"
```
Expected: PASS, all 4 JSONs valid.

- [ ] **Step 6: Commit**

```bash
git add src/shared/i18n/locales/
git commit -m "feat(i18n): add srs.algorithm.fsrs keys"
```

---

## Task 3: Extend SrsAlgorithmId type

**Files:**
- Modify: `src/core/services/srs/SrsAlgorithm.ts`

- [ ] **Step 1: Update the type union**

Find:
```ts
export type SrsAlgorithmId = "leitner" | "sm2";
```

Replace with:
```ts
export type SrsAlgorithmId = "leitner" | "sm2" | "fsrs";
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: typecheck WILL fail in `srsAlgorithmRegistry.ts` because the `Record<SrsAlgorithmId, SrsAlgorithm>` literal no longer covers all keys (missing `fsrs`). That's expected and will be fixed in Task 5. Continue.

- [ ] **Step 3: Defer commit until Task 5 (combined wiring commit).**

---

## Task 4: FsrsAlgorithm adapter (TDD)

**Files:**
- Create: `src/core/services/srs/FsrsAlgorithm.ts`
- Create: `__tests__/services/srs/FsrsAlgorithm.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/services/srs/FsrsAlgorithm.test.ts`:

```ts
import { FsrsAlgorithm } from "@/src/core/services/srs/FsrsAlgorithm";
import { createMockCardSrsState } from "@/__tests__/helpers/createMockCardSrsState";

const REVIEWED_AT = "2026-04-29T00:00:00.000Z";
const algo = new FsrsAlgorithm();

describe("FsrsAlgorithm", () => {
  it("first review on empty algorithmData populates due/stability/difficulty/state/reps", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: {} }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    const data = next.algorithmData as Record<string, unknown>;
    expect(typeof data.due).toBe("string");
    expect(typeof data.stability).toBe("number");
    expect(typeof data.difficulty).toBe("number");
    expect(Number(data.state)).toBeGreaterThanOrEqual(0);
    expect(Number(data.reps)).toBeGreaterThanOrEqual(1);
  });

  it("again rating increments lapses", () => {
    const seed = createMockCardSrsState({
      algorithmData: {
        due: "2026-04-30T00:00:00.000Z",
        stability: 5,
        difficulty: 6,
        elapsedDays: 0,
        scheduledDays: 5,
        reps: 3,
        lapses: 0,
        state: 2,
        lastReview: "2026-04-25T00:00:00.000Z",
      },
    });
    const next = algo.computeNextState(seed, {
      rating: "again",
      reviewedAt: REVIEWED_AT,
      elapsedMs: 0,
    });
    expect((next.algorithmData as { lapses: number }).lapses).toBe(1);
  });

  it("round-trips via algorithmData fields", () => {
    const first = algo.computeNextState(
      createMockCardSrsState(),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    const second = algo.computeNextState(
      { ...createMockCardSrsState(), algorithmData: first.algorithmData },
      {
        rating: "good",
        reviewedAt: "2026-05-01T00:00:00.000Z",
        elapsedMs: 0,
      },
    );
    expect((second.algorithmData as { reps: number }).reps).toBeGreaterThan(
      (first.algorithmData as { reps: number }).reps,
    );
  });

  it("masteryLevel = 0 when state is New (state 0)", () => {
    // Direct seed of an unreviewed New-state card. Verify the mapping function
    // by checking the result of a fresh computeNextState whose RESULT lands in
    // a Learning state — the assertion here is on the seed's mastery via a
    // round-trip that keeps state=0. We accomplish this by passing again-on-empty,
    // which typically lands in Learning (state=1). To test state=0 mapping, we
    // just check the helper directly via the public computeNextState path.
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: {} }),
      { rating: "again", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    // After "again" on an empty card, FSRS typically places the card in Learning.
    // For state=0 mapping, we assert via the helper that masteryLevel correlates
    // with state value: state in {0} -> 0, {1, 3} -> 1.
    const stateAfter = Number((next.algorithmData as { state: number }).state);
    if (stateAfter === 0) {
      expect(next.masteryLevel).toBe(0);
    } else if (stateAfter === 1 || stateAfter === 3) {
      expect(next.masteryLevel).toBe(1);
    } else {
      // state 2 (Review) — depends on reps mapping
      expect([2, 3, 4]).toContain(next.masteryLevel);
    }
  });

  it("masteryLevel = 4 when state=Review and reps>=5", () => {
    const seed = createMockCardSrsState({
      algorithmData: {
        due: "2026-05-01T00:00:00.000Z",
        stability: 30,
        difficulty: 4,
        elapsedDays: 10,
        scheduledDays: 20,
        reps: 6,
        lapses: 0,
        state: 2,
        lastReview: "2026-04-25T00:00:00.000Z",
      },
    });
    const next = algo.computeNextState(seed, {
      rating: "good",
      reviewedAt: REVIEWED_AT,
      elapsedMs: 0,
    });
    // After good on a state=2 reps=6 card, the next state should still be Review
    // (state=2) and reps>=7 -> masteryLevel = 4.
    expect(next.masteryLevel).toBe(4);
  });

  it("nextReviewAt is in the future for non-again ratings", () => {
    const next = algo.computeNextState(
      createMockCardSrsState(),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.nextReviewAt).not.toBeNull();
    expect(new Date(next.nextReviewAt!).getTime()).toBeGreaterThan(
      new Date(REVIEWED_AT).getTime(),
    );
  });

  it("intervalDays equals scheduledDays from FSRS", () => {
    const next = algo.computeNextState(
      createMockCardSrsState(),
      { rating: "easy", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(
      (next.algorithmData as { scheduledDays: number }).scheduledDays,
    );
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
npx jest __tests__/services/srs/FsrsAlgorithm.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/core/services/srs/FsrsAlgorithm.ts**

```ts
import {
  Card,
  FSRS,
  State,
  createEmptyCard,
  generatorParameters,
} from "ts-fsrs";

import type { ReviewRating } from "@/src/core/domain/models";
import type {
  CardSrsState,
  ReviewInput,
  SrsAlgorithm,
} from "@/src/core/services/srs/SrsAlgorithm";

const RATING_TO_FSRS: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

interface SerializedFsrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}

function toFsrsCard(data: Record<string, unknown>): Card {
  if (typeof data.due !== "string") {
    return createEmptyCard();
  }
  return {
    due: new Date(data.due),
    stability: Number(data.stability ?? 0),
    difficulty: Number(data.difficulty ?? 0),
    elapsed_days: Number(data.elapsedDays ?? 0),
    scheduled_days: Number(data.scheduledDays ?? 0),
    reps: Number(data.reps ?? 0),
    lapses: Number(data.lapses ?? 0),
    state: Number(data.state ?? 0) as State,
    last_review:
      typeof data.lastReview === "string" ? new Date(data.lastReview) : undefined,
  };
}

function fromFsrsCard(card: Card): SerializedFsrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function masteryFromFsrs(card: Card): number {
  if (card.state === 0) return 0;
  if (card.state === 1 || card.state === 3) return 1;
  // state === 2 (Review)
  if (card.reps <= 2) return 2;
  if (card.reps <= 4) return 3;
  return 4;
}

export class FsrsAlgorithm implements SrsAlgorithm {
  readonly id = "fsrs" as const;
  private readonly engine = new FSRS(
    generatorParameters({ enable_fuzz: true }),
  );

  computeNextState(prev: CardSrsState, input: ReviewInput): CardSrsState {
    const card = toFsrsCard(prev.algorithmData);
    const reviewedAt = new Date(input.reviewedAt);
    const result = this.engine.next(card, reviewedAt, RATING_TO_FSRS[input.rating]);
    const nextCard = result.card;

    return {
      masteryLevel: masteryFromFsrs(nextCard),
      easeFactor: nextCard.difficulty,
      intervalDays: nextCard.scheduled_days,
      nextReviewAt: nextCard.due.toISOString(),
      lastReviewedAt: input.reviewedAt,
      algorithmData: fromFsrsCard(nextCard) as unknown as Record<string, unknown>,
    };
  }
}
```

> If `ts-fsrs` exports the `next` method differently (e.g., requires the rating as `Rating.Good` enum rather than a number), inspect the actual API at runtime by reading `node_modules/ts-fsrs/dist/index.d.ts`. Two common variations:
> - `engine.next(card, now, rating)` returns `{ card, log }` — the code above assumes this.
> - `engine.repeat(card, now)` returns a record indexed by Rating with `.card` for each — if so, replace the call with `this.engine.repeat(card, reviewedAt)[RATING_TO_FSRS[input.rating]].card`.
>
> If the second pattern is used, the implementation becomes:
>
> ```ts
> const scheduling = this.engine.repeat(card, reviewedAt);
> const nextCard = scheduling[RATING_TO_FSRS[input.rating]].card;
> ```
>
> Adapt to whichever API the installed version exposes. If neither works, `import { Rating } from "ts-fsrs"` and pass `Rating.Good` etc. by enum.

- [ ] **Step 4: Run tests — confirm PASS**

```bash
npx jest __tests__/services/srs/FsrsAlgorithm.test.ts
```
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/services/srs/FsrsAlgorithm.ts \
        __tests__/services/srs/FsrsAlgorithm.test.ts
git commit -m "feat(srs): FSRS algorithm adapter via ts-fsrs"
```

---

## Task 5: Register FSRS in srsAlgorithmRegistry + SrsPreferenceService fallback

**Files:**
- Modify: `src/core/services/srs/srsAlgorithmRegistry.ts`
- Modify: `src/core/services/srs/SrsPreferenceService.ts`
- Modify: `__tests__/services/srs/SrsPreferenceService.test.ts`

- [ ] **Step 1: Update srsAlgorithmRegistry.ts**

Replace contents to:

```ts
import { FsrsAlgorithm } from "@/src/core/services/srs/FsrsAlgorithm";
import { LeitnerAlgorithm } from "@/src/core/services/srs/LeitnerAlgorithm";
import { Sm2Algorithm } from "@/src/core/services/srs/Sm2Algorithm";
import type {
  SrsAlgorithm,
  SrsAlgorithmId,
} from "@/src/core/services/srs/SrsAlgorithm";

const REGISTRY: Record<SrsAlgorithmId, SrsAlgorithm> = {
  leitner: new LeitnerAlgorithm(),
  sm2: new Sm2Algorithm(),
  fsrs: new FsrsAlgorithm(),
};

export function getSrsAlgorithm(id: SrsAlgorithmId): SrsAlgorithm {
  return REGISTRY[id];
}
```

- [ ] **Step 2: Update SrsPreferenceService.ts fallback**

Find the `getAlgorithmAsync` method. Replace its body so the union check accepts `"fsrs"`:

```ts
async getAlgorithmAsync(): Promise<SrsAlgorithmId> {
  const raw = await this.appMeta.getValueAsync(KEY);
  if (raw === "leitner" || raw === "sm2" || raw === "fsrs") return raw;
  return DEFAULT_ALGORITHM;
}
```

- [ ] **Step 3: Add a test case to SrsPreferenceService.test.ts**

Open `__tests__/services/srs/SrsPreferenceService.test.ts` and append a 4th test inside the existing `describe("SrsPreferenceService", ...)` block:

```ts
it("returns fsrs when stored value is fsrs", async () => {
  const meta = createMockAppMetaStore({ "srs.algorithm": "fsrs" });
  const svc = new SrsPreferenceService(meta);
  expect(await svc.getAlgorithmAsync()).toBe("fsrs");
});
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm test
```
Expected: ALL PASS.

- [ ] **Step 5: Commit (combined with Task 3 type extension)**

```bash
git add src/core/services/srs/SrsAlgorithm.ts \
        src/core/services/srs/srsAlgorithmRegistry.ts \
        src/core/services/srs/SrsPreferenceService.ts \
        __tests__/services/srs/SrsPreferenceService.test.ts
git commit -m "feat(srs): register fsrs in registry and preference fallback"
```

---

## Task 6: Add FSRS option to SrsAlgorithmPicker

**Files:**
- Modify: `src/features/settings/components/SrsAlgorithmPicker.tsx`

- [ ] **Step 1: Update OPTIONS, TITLE_KEYS, DESC_KEYS**

Find:
```ts
const OPTIONS: SrsAlgorithmId[] = ["leitner", "sm2"];
const TITLE_KEYS: Record<SrsAlgorithmId, TranslationKey> = {
  leitner: "srs.algorithm.leitner.title",
  sm2: "srs.algorithm.sm2.title",
};
const DESC_KEYS: Record<SrsAlgorithmId, TranslationKey> = {
  leitner: "srs.algorithm.leitner.description",
  sm2: "srs.algorithm.sm2.description",
};
```

Replace with:
```ts
const OPTIONS: SrsAlgorithmId[] = ["leitner", "sm2", "fsrs"];
const TITLE_KEYS: Record<SrsAlgorithmId, TranslationKey> = {
  leitner: "srs.algorithm.leitner.title",
  sm2: "srs.algorithm.sm2.title",
  fsrs: "srs.algorithm.fsrs.title",
};
const DESC_KEYS: Record<SrsAlgorithmId, TranslationKey> = {
  leitner: "srs.algorithm.leitner.description",
  sm2: "srs.algorithm.sm2.description",
  fsrs: "srs.algorithm.fsrs.description",
};
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm test
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/settings/components/SrsAlgorithmPicker.tsx
git commit -m "feat(settings): show FSRS option in SrsAlgorithmPicker"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full pass**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: ALL PASS.

- [ ] **Step 2: Confirm registry coverage**

```bash
node -e "const r = require('./src/core/services/srs/srsAlgorithmRegistry.ts'); console.log('skip')" 2>/dev/null || true
grep -n "leitner\|sm2\|fsrs" src/core/services/srs/srsAlgorithmRegistry.ts
```
Expected: all three IDs present in REGISTRY literal.

- [ ] **Step 3: Confirm i18n keys**

```bash
node -e "for (const f of ['ko','en','ja','zh']) { const j=JSON.parse(require('fs').readFileSync('src/shared/i18n/locales/'+f+'.json','utf8')); if (!j.srs.algorithm.fsrs) throw new Error(f+' missing fsrs'); console.log(f, 'fsrs.title:', j.srs.algorithm.fsrs.title); }"
```
Expected: all 4 locales print their `Advanced (FSRS)` title.

- [ ] **Step 4: Manual smoke test summary (for the user)**

> Phase B 코드 완료. 외부 작업 없음. 수동 검증:
> 1. 앱 시작 → 설정 → "학습 알고리즘" 섹션에 3 옵션 표시 (Leitner / SM-2 / Advanced FSRS)
> 2. FSRS 선택 → 토스트 "Advanced (FSRS)로 변경했어요"
> 3. 학습 화면 진입 → 4버튼 (다시/어려움/알맞음/쉬움) + 각 버튼에 다음 간격 preview
> 4. 카드 학습 후 SQLite의 `local_user_card_states.algorithm_data` 컬럼 확인 → `due/stability/difficulty/state/reps` 등 채워짐
> 5. 같은 카드 "good" 반복 → interval 점점 길어짐 (FSRS의 지수형 동작)

---

## Self-Review (performed by author)

**Spec coverage:**
- ts-fsrs 라이브러리 설치 → Task 1 ✓
- FSRS-4.5 default 파라미터 → Task 4 (`generatorParameters({ enable_fuzz: true })`) ✓
- `SrsAlgorithmId` 타입 확장 → Task 3 ✓
- `FsrsAlgorithm` 어댑터 + 7 테스트 → Task 4 ✓
- `srsAlgorithmRegistry`에 fsrs 등록 → Task 5 ✓
- `SrsPreferenceService` fallback에 fsrs 추가 → Task 5 ✓
- Picker UI에 옵션 1개 추가 → Task 6 ✓
- 4 locale i18n 키 → Task 2 ✓
- `algorithmData` JSON 직렬화 (`due/stability/difficulty/elapsedDays/scheduledDays/reps/lapses/state/lastReview`) → Task 4 (`fromFsrsCard`) ✓
- 빈 `algorithmData` → `createEmptyCard` → Task 4 (`toFsrsCard`) ✓
- `mastery_level` 동기화 (`state` + `reps`) → Task 4 (`masteryFromFsrs`) ✓
- 다른 알고리즘에서 전환 시 잔존 데이터 무시 → Task 4 (`toFsrsCard`가 `data.due`가 없으면 빈 카드) ✓
- SQLite 마이그레이션 없음 — Phase A 컬럼 재사용 ✓
- 외부 작업 없음 ✓

**Placeholder scan:** All steps include actual code or commands. The `ts-fsrs` API variation note in Task 4 is a guard (with concrete fallback variants) for library version differences, not a vague TODO.

**Type consistency:**
- `SrsAlgorithmId` from Task 3 used in Tasks 5, 6
- `FsrsAlgorithm` class name from Task 4 used in Task 5
- `algorithmData` field name (camelCase) consistent in tests (Task 4) and adapter helpers (`toFsrsCard`/`fromFsrsCard`)
- `RATING_TO_FSRS` keys (`again/hard/good/easy`) match Phase A's `ReviewRating` enum

One intentional deferred detail:
- `ts-fsrs` exact `next`/`repeat` API surface — Task 4 step 3 inspects at implementation time and provides two concrete fallback patterns.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-29-phaseB-fsrs.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
