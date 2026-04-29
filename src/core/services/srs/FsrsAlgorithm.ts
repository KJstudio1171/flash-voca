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
    learning_steps: Number(data.learningSteps ?? 0),
    reps: Number(data.reps ?? 0),
    lapses: Number(data.lapses ?? 0),
    state: Number(data.state ?? 0) as State,
    last_review:
      typeof data.lastReview === "string"
        ? new Date(data.lastReview)
        : undefined,
  };
}

function fromFsrsCard(card: Card): SerializedFsrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days ?? 0,
    scheduledDays: card.scheduled_days ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function masteryFromFsrs(card: Card): number {
  if (card.state === State.New) return 0;
  if (card.state === State.Learning || card.state === State.Relearning) return 1;
  // State.Review
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
    // Grade = Exclude<Rating, Rating.Manual> = 1|2|3|4
    const grade = RATING_TO_FSRS[input.rating] as Parameters<typeof this.engine.next>[2];
    const result = this.engine.next(card, reviewedAt, grade);
    const nextCard = result.card;

    return {
      masteryLevel: masteryFromFsrs(nextCard),
      easeFactor: nextCard.difficulty,
      intervalDays: nextCard.scheduled_days ?? 0,
      nextReviewAt: nextCard.due.toISOString(),
      lastReviewedAt: input.reviewedAt,
      algorithmData: fromFsrsCard(nextCard) as unknown as Record<string, unknown>,
    };
  }
}
