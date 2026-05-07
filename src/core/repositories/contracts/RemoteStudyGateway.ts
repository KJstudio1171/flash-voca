import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";

export interface RemoteReviewLogPayload {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  rating: number;
  elapsedMs: number;
  reviewedAt: string;
  previousSrsState: CardSrsState;
  nextSrsState: CardSrsState;
}

export interface RemoteUserCardStatePayload extends CardSrsState {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteStudyGateway {
  upsertReviewLogAsync(userId: string, payload: RemoteReviewLogPayload): Promise<void>;
  deleteReviewLogAsync(userId: string, reviewLogId: string): Promise<void>;
  upsertUserCardStateAsync(
    userId: string,
    payload: RemoteUserCardStatePayload,
  ): Promise<void>;
}
