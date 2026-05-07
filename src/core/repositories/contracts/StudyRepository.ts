import {
  HomeReviewStats,
  LogReviewInput,
  UserCardState,
} from "@/src/core/domain/models";
import type { SrsAlgorithm } from "@/src/core/services/srs/SrsAlgorithm";

export interface StudyRepository {
  listCardStatesAsync(deckId: string, userId: string): Promise<UserCardState[]>;
  listCardStatesByDeckIdsAsync(
    deckIds: string[],
    userId: string,
  ): Promise<UserCardState[]>;
  getHomeReviewStatsAsync(userId: string): Promise<HomeReviewStats>;
  logReviewAsync(
    input: LogReviewInput,
    userId: string,
    algorithm: SrsAlgorithm,
  ): Promise<void>;
  setBookmarkAsync(
    input: { deckId: string; cardId: string; isBookmarked: boolean },
    userId: string,
  ): Promise<void>;
  undoLastReviewAsync(deckId: string, userId: string): Promise<boolean>;
  markReviewLogSyncedAsync(reviewLogId: string): Promise<void>;
  markUserCardStateSyncedAsync(stateId: string): Promise<void>;
}
