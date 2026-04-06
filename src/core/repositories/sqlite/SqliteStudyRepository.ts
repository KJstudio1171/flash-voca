import { getDatabaseAsync } from "@/src/core/database/client";
import {
  LocalReviewLogRecord,
  LocalUserCardStateRecord,
} from "@/src/core/database/types";
import { LogReviewInput, UserCardState } from "@/src/core/domain/models";
import { enqueuePendingSyncOperationAsync } from "@/src/core/repositories/sqlite/shared/enqueuePendingSyncOperation";
import { createId } from "@/src/shared/utils/createId";

function mapState(row: LocalUserCardStateRecord): UserCardState {
  return {
    id: row.id,
    deckId: row.deckId,
    cardId: row.cardId,
    userId: row.userId,
    masteryLevel: Number(row.masteryLevel ?? 0),
    easeFactor: Number(row.easeFactor ?? 2.5),
    intervalDays: Number(row.intervalDays ?? 0),
    nextReviewAt: row.nextReviewAt,
    lastReviewedAt: row.lastReviewedAt,
    updatedAt: row.updatedAt,
  };
}

export class SqliteStudyRepository {
  async listCardStatesAsync(deckId: string, userId: string) {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<LocalUserCardStateRecord>(
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
          sync_state as syncState,
          last_synced_at as lastSyncedAt,
          created_at as createdAt,
          updated_at as updatedAt
        FROM local_user_card_states
        WHERE deck_id = ? AND user_id = ?;
      `,
      [deckId, userId],
    );

    return rows.map(mapState);
  }

  async logReviewAsync(input: LogReviewInput, userId: string) {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      const priorState = await tx.getFirstAsync<LocalUserCardStateRecord>(
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
            sync_state as syncState,
            last_synced_at as lastSyncedAt,
            created_at as createdAt,
            updated_at as updatedAt
          FROM local_user_card_states
          WHERE card_id = ? AND user_id = ?
          LIMIT 1;
        `,
        [input.cardId, userId],
      );

      const currentMastery = Number(priorState?.masteryLevel ?? 0);
      const nextMastery =
        input.rating <= 1
          ? 0
          : input.rating === 2
            ? Math.min(currentMastery + 1, 3)
            : Math.min(currentMastery + 2, 4);
      const intervalDays = input.rating <= 1 ? 0 : Math.max(1, nextMastery * 2);
      const nextReviewAt =
        input.rating <= 1
          ? now
          : new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
      const stateId = priorState?.id ?? createId("state");
      const createdAt = priorState?.createdAt ?? now;
      const reviewLog: LocalReviewLogRecord = {
        id: createId("review"),
        deckId: input.deckId,
        cardId: input.cardId,
        userId,
        rating: input.rating,
        elapsedMs: input.elapsedMs,
        reviewedAt: now,
        syncState: "pending",
        syncedAt: null,
      };

      await tx.runAsync(
        `
          INSERT INTO local_review_logs (
            id, deck_id, card_id, user_id, rating, elapsed_ms, reviewed_at, sync_state, synced_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          reviewLog.id,
          reviewLog.deckId,
          reviewLog.cardId,
          reviewLog.userId,
          reviewLog.rating,
          reviewLog.elapsedMs,
          reviewLog.reviewedAt,
          reviewLog.syncState,
          reviewLog.syncedAt,
        ],
      );

      await tx.runAsync(
        `
          INSERT INTO local_user_card_states (
            id, deck_id, card_id, user_id, mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at, sync_state, last_synced_at, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)
          ON CONFLICT(card_id, user_id) DO UPDATE SET
            deck_id = excluded.deck_id,
            mastery_level = excluded.mastery_level,
            ease_factor = excluded.ease_factor,
            interval_days = excluded.interval_days,
            next_review_at = excluded.next_review_at,
            last_reviewed_at = excluded.last_reviewed_at,
            sync_state = excluded.sync_state,
            last_synced_at = NULL,
            updated_at = excluded.updated_at;
        `,
        [
          stateId,
          input.deckId,
          input.cardId,
          userId,
          nextMastery,
          2.5,
          intervalDays,
          nextReviewAt,
          now,
          createdAt,
          now,
        ],
      );

      await enqueuePendingSyncOperationAsync(tx, {
        entityType: "review_log",
        entityId: reviewLog.id,
        operationType: "upsert",
        payload: reviewLog,
      });

      await enqueuePendingSyncOperationAsync(tx, {
        entityType: "user_card_state",
        entityId: stateId,
        operationType: "upsert",
        payload: {
          id: stateId,
          deckId: input.deckId,
          cardId: input.cardId,
          userId,
          masteryLevel: nextMastery,
          easeFactor: 2.5,
          intervalDays,
          nextReviewAt,
          lastReviewedAt: now,
          createdAt,
          updatedAt: now,
        },
      });
    });
  }
}
