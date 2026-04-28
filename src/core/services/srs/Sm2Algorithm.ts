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
        intervalDays = repetitions === 0 ? 1 : Math.max(1, Math.round(prevInterval * 1.2));
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
        else intervalDays = Math.max(1, Math.round(prevInterval * prevEase * 1.3));
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
