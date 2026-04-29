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
      { rating: "good", reviewedAt: "2026-05-01T00:00:00.000Z", elapsedMs: 0 },
    );
    expect((second.algorithmData as { reps: number }).reps).toBeGreaterThan(
      (first.algorithmData as { reps: number }).reps,
    );
  });

  it("masteryLevel reflects state per mapping rules", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({ algorithmData: {} }),
      { rating: "again", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    const stateAfter = Number((next.algorithmData as { state: number }).state);
    if (stateAfter === 0) {
      expect(next.masteryLevel).toBe(0);
    } else if (stateAfter === 1 || stateAfter === 3) {
      expect(next.masteryLevel).toBe(1);
    } else {
      expect([2, 3, 4]).toContain(next.masteryLevel);
    }
  });

  it("masteryLevel = 4 when state=Review (2) and reps>=5 after good", () => {
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
