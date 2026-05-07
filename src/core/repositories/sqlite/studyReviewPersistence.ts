import type {
  SQLiteBindParams,
  SQLiteRunResult,
} from "expo-sqlite";

import type { LocalUserCardStateRecord } from "@/src/core/database/types";
import type { LogReviewInput } from "@/src/core/domain/models";
import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";

export interface StudyWriteTx {
  runAsync(sql: string, params: SQLiteBindParams): Promise<SQLiteRunResult>;
  getFirstAsync<T>(sql: string, params: SQLiteBindParams): Promise<T | null>;
}

export interface PriorSrsStateRow {
  id: string | null;
  mastery_level: number;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  algorithm_data: string | null;
  is_bookmarked: number;
  created_at: string;
}

export type BookmarkStateRow = LocalUserCardStateRecord & {
  algorithmData?: string | null;
};

export interface LastReviewRow {
  id: string;
  card_id: string;
  previous_srs_state: string | null;
}

export interface RestoredStateRow {
  id: string;
  deck_id: string;
  card_id: string;
  user_id: string;
  is_bookmarked: number;
  created_at: string;
}

export function readBookmarkStateValues(
  priorState: BookmarkStateRow | null,
  now: string,
): {
  id: string | null;
  createdAt: string;
  masteryLevel: number | null;
  easeFactor: number | null;
  intervalDays: number | null;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  algorithmDataRaw: string | null | undefined;
} {
  return {
    id: priorState?.id ?? null,
    createdAt: priorState?.createdAt ?? now,
    masteryLevel: priorState?.masteryLevel ?? null,
    easeFactor: priorState?.easeFactor ?? null,
    intervalDays: priorState?.intervalDays ?? null,
    nextReviewAt: priorState?.nextReviewAt ?? null,
    lastReviewedAt: priorState?.lastReviewedAt ?? null,
    algorithmDataRaw: priorState?.algorithmData,
  };
}

export async function loadPriorSrsStateRowAsync(
  tx: StudyWriteTx,
  cardId: string,
  userId: string,
): Promise<PriorSrsStateRow | null> {
  return tx.getFirstAsync<PriorSrsStateRow>(
    `SELECT id, mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at, algorithm_data, is_bookmarked, created_at
     FROM local_user_card_states
     WHERE card_id = ? AND user_id = ?;`,
    [cardId, userId],
  );
}

export async function insertReviewLogAsync(
  tx: StudyWriteTx,
  input: {
    id: string;
    review: LogReviewInput;
    userId: string;
    rating: number;
    reviewedAt: string;
    previousSrsStateJson: string;
    nextSrsStateJson: string;
  },
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO local_review_logs (
      id, deck_id, card_id, user_id, rating, elapsed_ms, reviewed_at,
      previous_srs_state, next_srs_state, sync_state, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL);`,
    [
      input.id,
      input.review.deckId,
      input.review.cardId,
      input.userId,
      input.rating,
      input.review.elapsedMs,
      input.reviewedAt,
      input.previousSrsStateJson,
      input.nextSrsStateJson,
    ],
  );
}

export async function upsertUserCardStateFromReviewAsync(
  tx: StudyWriteTx,
  input: {
    id: string;
    review: LogReviewInput;
    userId: string;
    state: CardSrsState;
    isBookmarked: number;
    createdAt: string;
    updatedAt: string;
  },
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO local_user_card_states (
      id, deck_id, card_id, user_id, mastery_level, ease_factor, interval_days,
      next_review_at, last_reviewed_at, is_bookmarked, algorithm_data,
      sync_state, last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)
    ON CONFLICT(card_id, user_id) DO UPDATE SET
      mastery_level = excluded.mastery_level,
      ease_factor = excluded.ease_factor,
      interval_days = excluded.interval_days,
      next_review_at = excluded.next_review_at,
      last_reviewed_at = excluded.last_reviewed_at,
      algorithm_data = excluded.algorithm_data,
      sync_state = 'pending',
      last_synced_at = NULL,
      updated_at = excluded.updated_at;`,
    [
      input.id,
      input.review.deckId,
      input.review.cardId,
      input.userId,
      input.state.masteryLevel,
      input.state.easeFactor,
      input.state.intervalDays,
      input.state.nextReviewAt,
      input.state.lastReviewedAt,
      input.isBookmarked,
      JSON.stringify(input.state.algorithmData),
      input.createdAt,
      input.updatedAt,
    ],
  );
}

export async function loadBookmarkStateAsync(
  tx: StudyWriteTx,
  cardId: string,
  userId: string,
): Promise<BookmarkStateRow | null> {
  return tx.getFirstAsync<BookmarkStateRow>(
    `
      SELECT
        id,
        deck_id as deckId,
        card_id as cardId,
        user_id as userId,
        mastery_level as masteryLevel,
        ease_factor as easeFactor,
        interval_days as intervalDays,
        next_review_at as nextReviewAt,
        last_reviewed_at as lastReviewedAt,
        is_bookmarked as isBookmarked,
        algorithm_data as algorithmData,
        sync_state as syncState,
        last_synced_at as lastSyncedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM local_user_card_states
      WHERE card_id = ? AND user_id = ?
      LIMIT 1;
    `,
    [cardId, userId],
  );
}

export async function upsertBookmarkStateAsync(
  tx: StudyWriteTx,
  input: {
    id: string;
    deckId: string;
    cardId: string;
    userId: string;
    masteryLevel: number;
    easeFactor: number;
    intervalDays: number;
    nextReviewAt: string | null;
    lastReviewedAt: string | null;
    isBookmarked: number;
    createdAt: string;
    updatedAt: string;
  },
): Promise<void> {
  await tx.runAsync(
    `
      INSERT INTO local_user_card_states (
        id, deck_id, card_id, user_id, mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at, is_bookmarked, sync_state, last_synced_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)
      ON CONFLICT(card_id, user_id) DO UPDATE SET
        deck_id = excluded.deck_id,
        mastery_level = excluded.mastery_level,
        ease_factor = excluded.ease_factor,
        interval_days = excluded.interval_days,
        next_review_at = excluded.next_review_at,
        last_reviewed_at = excluded.last_reviewed_at,
        is_bookmarked = excluded.is_bookmarked,
        sync_state = excluded.sync_state,
        last_synced_at = NULL,
        updated_at = excluded.updated_at;
    `,
    [
      input.id,
      input.deckId,
      input.cardId,
      input.userId,
      input.masteryLevel,
      input.easeFactor,
      input.intervalDays,
      input.nextReviewAt,
      input.lastReviewedAt,
      input.isBookmarked,
      input.createdAt,
      input.updatedAt,
    ],
  );
}

export async function loadLastReviewAsync(
  tx: StudyWriteTx,
  deckId: string,
  userId: string,
): Promise<LastReviewRow | null> {
  return tx.getFirstAsync<LastReviewRow>(
    `SELECT id, card_id, previous_srs_state FROM local_review_logs
     WHERE deck_id = ? AND user_id = ?
     ORDER BY reviewed_at DESC LIMIT 1;`,
    [deckId, userId],
  );
}

export async function deleteReviewLogAsync(
  tx: StudyWriteTx,
  reviewLogId: string,
): Promise<void> {
  await tx.runAsync("DELETE FROM local_review_logs WHERE id = ?;", [reviewLogId]);
}

export async function restoreUserCardStateAsync(
  tx: StudyWriteTx,
  input: {
    cardId: string;
    userId: string;
    previousState: CardSrsState;
    updatedAt: string;
  },
): Promise<void> {
  await tx.runAsync(
    `UPDATE local_user_card_states
     SET mastery_level = ?,
         ease_factor = ?,
         interval_days = ?,
         next_review_at = ?,
         last_reviewed_at = ?,
         algorithm_data = ?,
         sync_state = 'pending',
         last_synced_at = NULL,
         updated_at = ?
     WHERE card_id = ? AND user_id = ?;`,
    [
      input.previousState.masteryLevel,
      input.previousState.easeFactor,
      input.previousState.intervalDays,
      input.previousState.nextReviewAt,
      input.previousState.lastReviewedAt,
      JSON.stringify(input.previousState.algorithmData),
      input.updatedAt,
      input.cardId,
      input.userId,
    ],
  );
}

export async function loadRestoredStateAsync(
  tx: StudyWriteTx,
  cardId: string,
  userId: string,
): Promise<RestoredStateRow | null> {
  return tx.getFirstAsync<RestoredStateRow>(
    `SELECT id, deck_id, card_id, user_id, is_bookmarked, created_at
     FROM local_user_card_states
     WHERE card_id = ? AND user_id = ?
     LIMIT 1;`,
    [cardId, userId],
  );
}
