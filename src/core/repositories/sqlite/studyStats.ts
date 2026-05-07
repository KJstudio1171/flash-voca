import type { HomeRecentReviewActivity } from "@/src/core/domain/models";

export type TodayReviewStatsRow = {
  studiedCards: number;
  elapsedMs: number;
};

export type RecentReviewActivityRow = {
  id: string;
  deckId: string;
  cardId: string;
  term: string;
  rating: number;
  reviewedAt: string;
};

export function getLocalDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function getTodayIsoRange(now = new Date()) {
  const todayStart = getLocalDayStart(now);
  const tomorrowStart = addLocalDays(todayStart, 1);
  return {
    todayStartIso: todayStart.toISOString(),
    tomorrowStartIso: tomorrowStart.toISOString(),
  };
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countCurrentStreak(reviewedAtValues: string[], now = new Date()) {
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

export function mapRecentReviewActivity(
  row: RecentReviewActivityRow,
): HomeRecentReviewActivity {
  return {
    id: row.id,
    deckId: row.deckId,
    cardId: row.cardId,
    term: row.term,
    rating: Number(row.rating),
    reviewedAt: row.reviewedAt,
  };
}
