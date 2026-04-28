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
