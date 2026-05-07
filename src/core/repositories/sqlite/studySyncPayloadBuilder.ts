import type {
  RemoteReviewLogPayload,
  RemoteUserCardStatePayload,
} from "@/src/core/repositories/contracts/RemoteStudyGateway";
import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";

export type QueuedReviewLogPayload = RemoteReviewLogPayload & {
  syncState: "pending";
  syncedAt: null;
};

export function buildQueuedReviewLogPayload(input: {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  rating: number;
  elapsedMs: number;
  reviewedAt: string;
  previousSrsState: CardSrsState;
  nextSrsState: CardSrsState;
}): QueuedReviewLogPayload {
  return {
    id: input.id,
    deckId: input.deckId,
    cardId: input.cardId,
    userId: input.userId,
    rating: input.rating,
    elapsedMs: input.elapsedMs,
    reviewedAt: input.reviewedAt,
    previousSrsState: input.previousSrsState,
    nextSrsState: input.nextSrsState,
    syncState: "pending",
    syncedAt: null,
  };
}

export function buildQueuedUserCardStatePayload(input: {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  state: CardSrsState;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}): RemoteUserCardStatePayload {
  return {
    id: input.id,
    deckId: input.deckId,
    cardId: input.cardId,
    userId: input.userId,
    masteryLevel: input.state.masteryLevel,
    easeFactor: input.state.easeFactor,
    intervalDays: input.state.intervalDays,
    nextReviewAt: input.state.nextReviewAt,
    lastReviewedAt: input.state.lastReviewedAt,
    isBookmarked: input.isBookmarked,
    algorithmData: input.state.algorithmData,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
