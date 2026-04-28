import { getDatabaseAsync } from "@/src/core/database/client";
import { StudyRecordError } from "@/src/core/errors";
import {
  LocalReviewLogRecord,
  LocalUserCardStateRecord,
} from "@/src/core/database/types";
import {
  HomeRecentReviewActivity,
  HomeReviewStats,
  LogReviewInput,
  UserCardState,
} from "@/src/core/domain/models";
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
    isBookmarked: Number(row.isBookmarked ?? 0) === 1,
    algorithmData: {},
    updatedAt: row.updatedAt,
  };
}

function getNextReviewState(rating: number, currentMastery: number, reviewedAt: string) {
  const nextMastery =
    rating <= 1
      ? 0
      : rating === 2
        ? Math.min(currentMastery + 1, 3)
        : Math.min(currentMastery + 2, 4);
  const intervalDays = rating <= 1 ? 0 : Math.max(1, nextMastery * 2);
  const nextReviewAt =
    rating <= 1
      ? reviewedAt
      : new Date(
          new Date(reviewedAt).getTime() + intervalDays * 24 * 60 * 60 * 1000,
        ).toISOString();

  return { nextMastery, intervalDays, nextReviewAt };
}

function getLocalDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function countCurrentStreak(reviewedAtValues: string[], now = new Date()) {
  const reviewedDateKeys = new Set(
    reviewedAtValues.map((value) => getLocalDateKey(new Date(value))),
  );
  let cursor = getLocalDayStart(now);
  let streakDays = 0;

  while (reviewedDateKeys.has(getLocalDateKey(cursor))) {
    streakDays += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streakDays;
}

type TodayReviewStatsRow = {
  studiedCards: number;
  elapsedMs: number;
};

type RecentReviewActivityRow = {
  id: string;
  deckId: string;
  cardId: string;
  term: string;
  rating: number;
  reviewedAt: string;
};

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
          is_bookmarked as isBookmarked,
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

  async getHomeReviewStatsAsync(userId: string): Promise<HomeReviewStats> {
    const db = await getDatabaseAsync();
    const todayStart = getLocalDayStart(new Date());
    const tomorrowStart = addLocalDays(todayStart, 1);
    const todayStartIso = todayStart.toISOString();
    const tomorrowStartIso = tomorrowStart.toISOString();

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
        `
          SELECT reviewed_at as reviewedAt
          FROM local_review_logs
          WHERE user_id = ?
          ORDER BY reviewed_at DESC;
        `,
        [userId],
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
      recentActivities: recentRows.map(
        (row): HomeRecentReviewActivity => ({
          id: row.id,
          deckId: row.deckId,
          cardId: row.cardId,
          term: row.term,
          rating: Number(row.rating),
          reviewedAt: row.reviewedAt,
        }),
      ),
    };
  }

  async logReviewAsync(input: LogReviewInput, userId: string) {
    try {
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
              is_bookmarked as isBookmarked,
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
        const { intervalDays, nextMastery, nextReviewAt } = getNextReviewState(
          input.rating,
          currentMastery,
          now,
        );
        const stateId = priorState?.id ?? createId("state");
        const createdAt = priorState?.createdAt ?? now;
        const isBookmarked = Number(priorState?.isBookmarked ?? 0);
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
            stateId,
            input.deckId,
            input.cardId,
            userId,
            nextMastery,
            2.5,
            intervalDays,
            nextReviewAt,
            now,
            isBookmarked,
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
            isBookmarked: isBookmarked === 1,
            algorithmData: {},
            createdAt,
            updatedAt: now,
          },
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
              is_bookmarked as isBookmarked,
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

        const stateId = priorState?.id ?? createId("state");
        const createdAt = priorState?.createdAt ?? now;
        const masteryLevel = Number(priorState?.masteryLevel ?? 0);
        const easeFactor = Number(priorState?.easeFactor ?? 2.5);
        const intervalDays = Number(priorState?.intervalDays ?? 0);
        const nextReviewAt = priorState?.nextReviewAt ?? null;
        const lastReviewedAt = priorState?.lastReviewedAt ?? null;
        const isBookmarked = input.isBookmarked ? 1 : 0;

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
            stateId,
            input.deckId,
            input.cardId,
            userId,
            masteryLevel,
            easeFactor,
            intervalDays,
            nextReviewAt,
            lastReviewedAt,
            isBookmarked,
            createdAt,
            now,
          ],
        );

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "user_card_state",
          entityId: stateId,
          operationType: "upsert",
          payload: {
            id: stateId,
            deckId: input.deckId,
            cardId: input.cardId,
            userId,
            masteryLevel,
            easeFactor,
            intervalDays,
            nextReviewAt,
            lastReviewedAt,
            isBookmarked: input.isBookmarked,
            algorithmData: {},
            createdAt,
            updatedAt: now,
          },
        });
      });
    } catch (error) {
      throw new StudyRecordError({
        context: { deckId: input.deckId, cardId: input.cardId },
        cause: error,
      });
    }
  }

  async undoLastReviewAsync(deckId: string, userId: string) {
    try {
      const db = await getDatabaseAsync();
      let didUndo = false;

      await db.withExclusiveTransactionAsync(async (tx) => {
        const latestReview = await tx.getFirstAsync<LocalReviewLogRecord>(
          `
            SELECT
              id,
              deck_id as deckId,
              card_id as cardId,
              user_id as userId,
              rating,
              elapsed_ms as elapsedMs,
              reviewed_at as reviewedAt,
              sync_state as syncState,
              synced_at as syncedAt
            FROM local_review_logs
            WHERE deck_id = ? AND user_id = ?
            ORDER BY reviewed_at DESC
            LIMIT 1;
          `,
          [deckId, userId],
        );

        if (!latestReview) {
          return;
        }

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
              is_bookmarked as isBookmarked,
              sync_state as syncState,
              last_synced_at as lastSyncedAt,
              created_at as createdAt,
              updated_at as updatedAt
            FROM local_user_card_states
            WHERE card_id = ? AND user_id = ?
            LIMIT 1;
          `,
          [latestReview.cardId, userId],
        );

        await tx.runAsync("DELETE FROM local_review_logs WHERE id = ?;", [
          latestReview.id,
        ]);
        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "review_log",
          entityId: latestReview.id,
          operationType: "delete",
        });

        const remainingReviews = await tx.getAllAsync<LocalReviewLogRecord>(
          `
            SELECT
              id,
              deck_id as deckId,
              card_id as cardId,
              user_id as userId,
              rating,
              elapsed_ms as elapsedMs,
              reviewed_at as reviewedAt,
              sync_state as syncState,
              synced_at as syncedAt
            FROM local_review_logs
            WHERE card_id = ? AND user_id = ?
            ORDER BY reviewed_at ASC;
          `,
          [latestReview.cardId, userId],
        );

        const stateId = priorState?.id ?? createId("state");
        const isBookmarked = Number(priorState?.isBookmarked ?? 0);
        const now = new Date().toISOString();

        if (remainingReviews.length === 0 && isBookmarked === 0) {
          await tx.runAsync(
            "DELETE FROM local_user_card_states WHERE card_id = ? AND user_id = ?;",
            [latestReview.cardId, userId],
          );
          await enqueuePendingSyncOperationAsync(tx, {
            entityType: "user_card_state",
            entityId: stateId,
            operationType: "delete",
          });
          didUndo = true;
          return;
        }

        let masteryLevel = 0;
        let intervalDays = 0;
        let nextReviewAt: string | null = null;
        let lastReviewedAt: string | null = null;

        for (const review of remainingReviews) {
          const nextState = getNextReviewState(
            review.rating,
            masteryLevel,
            review.reviewedAt,
          );
          masteryLevel = nextState.nextMastery;
          intervalDays = nextState.intervalDays;
          nextReviewAt = nextState.nextReviewAt;
          lastReviewedAt = review.reviewedAt;
        }

        const createdAt =
          priorState?.createdAt ?? remainingReviews[0]?.reviewedAt ?? now;
        await tx.runAsync(
          `
            INSERT INTO local_user_card_states (
              id, deck_id, card_id, user_id, mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at, is_bookmarked, sync_state, last_synced_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 2.5, ?, ?, ?, ?, 'pending', NULL, ?, ?)
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
            stateId,
            latestReview.deckId,
            latestReview.cardId,
            userId,
            masteryLevel,
            intervalDays,
            nextReviewAt,
            lastReviewedAt,
            isBookmarked,
            createdAt,
            now,
          ],
        );

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "user_card_state",
          entityId: stateId,
          operationType: "upsert",
          payload: {
            id: stateId,
            deckId: latestReview.deckId,
            cardId: latestReview.cardId,
            userId,
            masteryLevel,
            easeFactor: 2.5,
            intervalDays,
            nextReviewAt,
            lastReviewedAt,
            isBookmarked: isBookmarked === 1,
            algorithmData: {},
            createdAt,
            updatedAt: now,
          },
        });
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
}
