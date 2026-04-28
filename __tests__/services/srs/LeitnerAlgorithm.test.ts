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
