import type { ReviewRating } from "@/src/core/domain/models";

export type SrsAlgorithmId = "leitner" | "sm2" | "fsrs";

export interface ReviewInput {
  rating: ReviewRating;
  reviewedAt: string;
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
