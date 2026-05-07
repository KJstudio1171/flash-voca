import { getDatabaseAsync } from "@/src/core/database/client";
import { StudyRecordError } from "@/src/core/errors";
import {
  LocalUserCardStateRecord,
} from "@/src/core/database/types";
import {
  HomeReviewStats,
  LogReviewInput,
} from "@/src/core/domain/models";
import { enqueuePendingSyncOperationAsync } from "@/src/core/repositories/sqlite/shared/enqueuePendingSyncOperation";
import {
  buildQueuedReviewLogPayload,
  buildQueuedUserCardStatePayload,
} from "@/src/core/repositories/sqlite/studySyncPayloadBuilder";
import {
  deleteReviewLogAsync,
  insertReviewLogAsync,
  loadBookmarkStateAsync,
  loadLastReviewAsync,
  loadPriorSrsStateRowAsync,
  loadRestoredStateAsync,
  readBookmarkStateValues,
  restoreUserCardStateAsync,
  upsertBookmarkStateAsync,
  upsertUserCardStateFromReviewAsync,
} from "@/src/core/repositories/sqlite/studyReviewPersistence";
import {
  buildPreviousSrsState,
  DEFAULT_EASE_FACTOR,
  DEFAULT_INTERVAL_DAYS,
  DEFAULT_MASTERY_LEVEL,
  mapUserCardState,
  parseAlgorithmData,
  parseSrsStateSnapshot,
  serializeSrsStateSnapshot,
} from "@/src/core/repositories/sqlite/studyStatePersistence";
import { createId } from "@/src/shared/utils/createId";
import { ratingToInt } from "@/src/core/services/srs/ratingCodec";
import type { SrsAlgorithm } from "@/src/core/services/srs/SrsAlgorithm";
import {
  countCurrentStreak,
  getTodayIsoRange,
  mapRecentReviewActivity,
} from "@/src/core/repositories/sqlite/studyStats";
import type {
  RecentReviewActivityRow,
  TodayReviewStatsRow,
} from "@/src/core/repositories/sqlite/studyStats";

function getStreakWindowStartIso(now = new Date()): string {
  const start = new Date(now);
  start.setDate(start.getDate() - 730);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export class SqliteStudyRepository {
  async listCardStatesAsync(deckId: string, userId: string) {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<LocalUserCardStateRecord & { algorithmData?: string | null }>(
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
        WHERE deck_id = ? AND user_id = ?;
      `,
      [deckId, userId],
    );

    return rows.map(mapUserCardState);
  }

  async listCardStatesByDeckIdsAsync(deckIds: string[], userId: string) {
    if (deckIds.length === 0) return [];
    const db = await getDatabaseAsync();
    const placeholders = deckIds.map(() => "?").join(",");
    const rows = await db.getAllAsync<LocalUserCardStateRecord & { algorithmData?: string | null }>(
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
        WHERE user_id = ? AND deck_id IN (${placeholders});
      `,
      [userId, ...deckIds],
    );

    return rows.map(mapUserCardState);
  }

  async getHomeReviewStatsAsync(userId: string): Promise<HomeReviewStats> {
    const db = await getDatabaseAsync();
    const { todayStartIso, tomorrowStartIso } = getTodayIsoRange();

    const [todayStats, reviewedAtRows, recentRows] = await Promise.all([
      db.getFirstAsync<TodayReviewStatsRow>(
        `
          SELECT
            COUNT(DISTINCT card_id) as studiedCards,
            COALESCE(SUM(elapsed_ms), 0) as elapsedMs
          FROM local_review_logs
          WHERE user_id = ?
            AND reviewed_at >= ?
            AND reviewed_at < ?;
        `,
        [userId, todayStartIso, tomorrowStartIso],
      ),
      db.getAllAsync<{ reviewedAt: string }>(
        // Streak counts consecutive days from today; 2 years of history is
        // far more than any realistic streak, and avoids loading the entire
        // review log table as it grows.
        `
          SELECT reviewed_at as reviewedAt
          FROM local_review_logs
          WHERE user_id = ?
            AND reviewed_at >= ?
          ORDER BY reviewed_at DESC;
        `,
        [userId, getStreakWindowStartIso()],
      ),
      db.getAllAsync<RecentReviewActivityRow>(
        `
          SELECT
            r.id as id,
            r.deck_id as deckId,
            r.card_id as cardId,
            c.term as term,
            r.rating as rating,
            r.reviewed_at as reviewedAt
          FROM local_review_logs r
          INNER JOIN local_deck_cards c ON c.id = r.card_id
          INNER JOIN local_decks d ON d.id = r.deck_id
          WHERE r.user_id = ?
            AND d.is_deleted = 0
          ORDER BY r.reviewed_at DESC
          LIMIT 4;
        `,
        [userId],
      ),
    ]);
    const elapsedMs = Number(todayStats?.elapsedMs ?? 0);

    return {
      studiedCards: Number(todayStats?.studiedCards ?? 0),
      studyMinutes: elapsedMs > 0 ? Math.max(1, Math.ceil(elapsedMs / 60_000)) : 0,
      streakDays: countCurrentStreak(reviewedAtRows.map((row) => row.reviewedAt)),
      recentActivities: recentRows.map(mapRecentReviewActivity),
    };
  }

  async logReviewAsync(input: LogReviewInput, userId: string, algorithm: SrsAlgorithm) {
    try {
      const db = await getDatabaseAsync();
      const reviewedAt = new Date().toISOString();

      await db.withExclusiveTransactionAsync(async (tx) => {
        const priorRow = await loadPriorSrsStateRowAsync(tx, input.cardId, userId);

        const prevState = buildPreviousSrsState(priorRow);

        const next = algorithm.computeNextState(prevState, {
          rating: input.rating,
          reviewedAt,
          elapsedMs: input.elapsedMs,
        });

        const now = reviewedAt;
        const stateId = priorRow?.id ?? createId("ucs");
        const createdAt = priorRow?.created_at ?? now;
        const isBookmarked = Number(priorRow?.is_bookmarked ?? 0);

        const reviewLogId = createId("rlog");

        const previousSrsStateJson = serializeSrsStateSnapshot(prevState);
        const nextSrsStateJson = serializeSrsStateSnapshot(next);

        await insertReviewLogAsync(tx, {
          id: reviewLogId,
          review: input,
          userId,
          rating: ratingToInt[input.rating],
          reviewedAt,
          previousSrsStateJson,
          nextSrsStateJson,
        });

        await upsertUserCardStateFromReviewAsync(tx, {
          id: stateId,
          review: input,
          userId,
          state: next,
          isBookmarked,
          createdAt,
          updatedAt: now,
        });

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "review_log",
          entityId: reviewLogId,
          operationType: "upsert",
          payload: buildQueuedReviewLogPayload({
            id: reviewLogId,
            deckId: input.deckId,
            cardId: input.cardId,
            userId,
            rating: ratingToInt[input.rating],
            elapsedMs: input.elapsedMs,
            reviewedAt,
            previousSrsState: prevState,
            nextSrsState: next,
          }),
        });

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "user_card_state",
          entityId: stateId,
          operationType: "upsert",
          payload: buildQueuedUserCardStatePayload({
            id: stateId,
            deckId: input.deckId,
            cardId: input.cardId,
            userId,
            state: next,
            isBookmarked: isBookmarked === 1,
            createdAt,
            updatedAt: now,
          }),
        });
      });
    } catch (error) {
      if (error instanceof StudyRecordError) {
        throw error;
      }
      throw new StudyRecordError({
        context: { deckId: input.deckId, cardId: input.cardId },
        cause: error,
      });
    }
  }

  async setBookmarkAsync(
    input: { deckId: string; cardId: string; isBookmarked: boolean },
    userId: string,
  ) {
    try {
      const db = await getDatabaseAsync();
      const now = new Date().toISOString();

      await db.withExclusiveTransactionAsync(async (tx) => {
        const priorState = await loadBookmarkStateAsync(tx, input.cardId, userId);
        const priorValues = readBookmarkStateValues(priorState, now);

        const stateId = priorValues.id ?? createId("state");
        const createdAt = priorValues.createdAt;
        const masteryLevel = Number(priorValues.masteryLevel ?? DEFAULT_MASTERY_LEVEL);
        const easeFactor = Number(priorValues.easeFactor ?? DEFAULT_EASE_FACTOR);
        const intervalDays = Number(priorValues.intervalDays ?? DEFAULT_INTERVAL_DAYS);
        const nextReviewAt = priorValues.nextReviewAt;
        const lastReviewedAt = priorValues.lastReviewedAt;
        const algorithmData = parseAlgorithmData(priorValues.algorithmDataRaw);
        const isBookmarked = input.isBookmarked ? 1 : 0;

        await upsertBookmarkStateAsync(tx, {
          id: stateId,
          deckId: input.deckId,
          cardId: input.cardId,
          userId,
          masteryLevel,
          easeFactor,
          intervalDays,
          nextReviewAt,
          lastReviewedAt,
          isBookmarked,
          createdAt,
          updatedAt: now,
        });

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "user_card_state",
          entityId: stateId,
          operationType: "upsert",
          payload: buildQueuedUserCardStatePayload({
            id: stateId,
            deckId: input.deckId,
            cardId: input.cardId,
            userId,
            state: {
              masteryLevel,
              easeFactor,
              intervalDays,
              nextReviewAt,
              lastReviewedAt,
              algorithmData,
            },
            isBookmarked: input.isBookmarked,
            createdAt,
            updatedAt: now,
          }),
        });
      });
    } catch (error) {
      throw new StudyRecordError({
        context: { deckId: input.deckId, cardId: input.cardId },
        cause: error,
      });
    }
  }

  async undoLastReviewAsync(deckId: string, userId: string): Promise<boolean> {
    try {
      const db = await getDatabaseAsync();
      let didUndo = false;

      await db.withExclusiveTransactionAsync(async (tx) => {
        const lastReview = await loadLastReviewAsync(tx, deckId, userId);

        if (!lastReview) return;

        await deleteReviewLogAsync(tx, lastReview.id);

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "review_log",
          entityId: lastReview.id,
          operationType: "delete",
        });

        const now = new Date().toISOString();

        const previousState = parseSrsStateSnapshot(lastReview.previous_srs_state);
        await restoreUserCardStateAsync(tx, {
          cardId: lastReview.card_id,
          userId,
          previousState,
          updatedAt: now,
        });

        const restoredState = await loadRestoredStateAsync(tx, lastReview.card_id, userId);

        if (restoredState) {
          await enqueuePendingSyncOperationAsync(tx, {
            entityType: "user_card_state",
            entityId: restoredState.id,
            operationType: "upsert",
            payload: buildQueuedUserCardStatePayload({
              id: restoredState.id,
              deckId: restoredState.deck_id,
              cardId: restoredState.card_id,
              userId: restoredState.user_id,
              state: previousState,
              isBookmarked: restoredState.is_bookmarked === 1,
              createdAt: restoredState.created_at,
              updatedAt: now,
            }),
          });
        }

        didUndo = true;
      });

      return didUndo;
    } catch (error) {
      throw new StudyRecordError({
        context: { deckId },
        cause: error,
      });
    }
  }

  async markReviewLogSyncedAsync(reviewLogId: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `UPDATE local_review_logs
       SET sync_state = 'synced', synced_at = ?
       WHERE id = ?;`,
      [new Date().toISOString(), reviewLogId],
    );
  }

  async markUserCardStateSyncedAsync(stateId: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `UPDATE local_user_card_states
       SET sync_state = 'synced', last_synced_at = ?
       WHERE id = ?;`,
      [new Date().toISOString(), stateId],
    );
  }
}
