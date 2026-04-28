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
      createMockCardSrsState({
        algorithmData: { repetitions: 1, lapses: 0 }, intervalDays: 1,
      }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(6);
  });

  it("third+ review good -> prev * ease", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 5, lapses: 0 },
        intervalDays: 10, easeFactor: 2.5,
      }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.intervalDays).toBe(25);
  });

  it("again resets repetitions and decreases ease (floor 1.3)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 3, lapses: 0 },
        intervalDays: 30, easeFactor: 1.4,
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
        intervalDays: 10, easeFactor: 2.5,
      }),
      { rating: "easy", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.easeFactor).toBeCloseTo(2.65, 2);
    expect(next.intervalDays).toBe(33);
  });

  it("hard decreases ease by 0.15 and applies x1.2 interval (rep>=1)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 3, lapses: 0 },
        intervalDays: 10, easeFactor: 2.5,
      }),
      { rating: "hard", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.easeFactor).toBeCloseTo(2.35, 2);
    expect(next.intervalDays).toBe(12);
  });

  it("syncs masteryLevel from min(4, repetitions)", () => {
    const next = algo.computeNextState(
      createMockCardSrsState({
        algorithmData: { repetitions: 7, lapses: 0 }, intervalDays: 30,
      }),
      { rating: "good", reviewedAt: REVIEWED_AT, elapsedMs: 0 },
    );
    expect(next.masteryLevel).toBe(4);
  });
});
