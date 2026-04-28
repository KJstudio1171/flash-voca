import { getDatabaseAsync } from "@/src/core/database/client";
import { StudyRecordError } from "@/src/core/errors";
import {
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
import { ratingToInt } from "@/src/core/services/srs/ratingCodec";
import type { CardSrsState, SrsAlgorithm } from "@/src/core/services/srs/SrsAlgorithm";

function parseAlgorithmData(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || raw.length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mapState(row: LocalUserCardStateRecord & { algorithmData?: string | null }): UserCardState {
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
    algorithmData: parseAlgorithmData(row.algorithmData),
    updatedAt: row.updatedAt,
  };
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

  async logReviewAsync(input: LogReviewInput, userId: string, algorithm: SrsAlgorithm) {
    try {
      const db = await getDatabaseAsync();
      const reviewedAt = new Date().toISOString();

      await db.withExclusiveTransactionAsync(async (tx) => {
        const priorRow = await tx.getFirstAsync<{
          id: string | null;
          mastery_level: number;
          ease_factor: number;
          interval_days: number;
          next_review_at: string | null;
          last_reviewed_at: string | null;
          algorithm_data: string | null;
          is_bookmarked: number;
          created_at: string;
        }>(
          `SELECT id, mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at, algorithm_data, is_bookmarked, created_at
           FROM local_user_card_states
           WHERE card_id = ? AND user_id = ?;`,
          [input.cardId, userId],
        );

        const prevState: CardSrsState = {
          masteryLevel: Number(priorRow?.mastery_level ?? 0),
          easeFactor: Number(priorRow?.ease_factor ?? 2.5),
          intervalDays: Number(priorRow?.interval_days ?? 0),
          nextReviewAt: priorRow?.next_review_at ?? null,
          lastReviewedAt: priorRow?.last_reviewed_at ?? null,
          algorithmData: parseAlgorithmData(priorRow?.algorithm_data),
        };

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

        await tx.runAsync(
          `INSERT INTO local_review_logs (
            id, deck_id, card_id, user_id, rating, elapsed_ms, reviewed_at,
            sync_state, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL);`,
          [
            reviewLogId,
            input.deckId,
            input.cardId,
            userId,
            ratingToInt[input.rating],
            input.elapsedMs,
            reviewedAt,
          ],
        );

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
            stateId,
            input.deckId,
            input.cardId,
            userId,
            next.masteryLevel,
            next.easeFactor,
            next.intervalDays,
            next.nextReviewAt,
            next.lastReviewedAt,
            isBookmarked,
            JSON.stringify(next.algorithmData),
            createdAt,
            now,
          ],
        );

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "review_log",
          entityId: reviewLogId,
          operationType: "upsert",
          payload: {
            id: reviewLogId,
            deckId: input.deckId,
            cardId: input.cardId,
            userId,
            rating: ratingToInt[input.rating],
            elapsedMs: input.elapsedMs,
            reviewedAt,
            syncState: "pending",
            syncedAt: null,
          },
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
            masteryLevel: next.masteryLevel,
            easeFactor: next.easeFactor,
            intervalDays: next.intervalDays,
            nextReviewAt: next.nextReviewAt,
            lastReviewedAt: next.lastReviewedAt,
            isBookmarked: isBookmarked === 1,
            algorithmData: next.algorithmData,
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

  async undoLastReviewAsync(deckId: string, userId: string): Promise<boolean> {
    try {
      const db = await getDatabaseAsync();
      let didUndo = false;

      await db.withExclusiveTransactionAsync(async (tx) => {
        const lastReview = await tx.getFirstAsync<{
          id: string;
          card_id: string;
        }>(
          `SELECT id, card_id FROM local_review_logs
           WHERE deck_id = ? AND user_id = ?
           ORDER BY reviewed_at DESC LIMIT 1;`,
          [deckId, userId],
        );

        if (!lastReview) return;

        await tx.runAsync(
          "DELETE FROM local_review_logs WHERE id = ?;",
          [lastReview.id],
        );

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "review_log",
          entityId: lastReview.id,
          operationType: "delete",
        });

        const now = new Date().toISOString();

        await tx.runAsync(
          `UPDATE local_user_card_states
           SET mastery_level = 0,
               ease_factor = 2.5,
               interval_days = 0,
               next_review_at = NULL,
               last_reviewed_at = NULL,
               algorithm_data = '{}',
               sync_state = 'pending',
               last_synced_at = NULL,
               updated_at = ?
           WHERE card_id = ? AND user_id = ?;`,
          [now, lastReview.card_id, userId],
        );

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
