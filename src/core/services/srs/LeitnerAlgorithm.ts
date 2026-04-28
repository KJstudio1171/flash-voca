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
      case "again": nextBox = 1; break;
      case "hard":  nextBox = clampBox(seedBox - 1); break;
      case "good":  nextBox = clampBox(seedBox + 1); break;
      case "easy":  nextBox = clampBox(seedBox + 2); break;
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
