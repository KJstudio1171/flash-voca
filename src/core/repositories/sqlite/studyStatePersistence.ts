import type { LocalUserCardStateRecord } from "@/src/core/database/types";
import type { UserCardState } from "@/src/core/domain/models";
import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";

export const DEFAULT_MASTERY_LEVEL = 0;
export const DEFAULT_EASE_FACTOR = 2.5;
export const DEFAULT_INTERVAL_DAYS = 0;
export const DEFAULT_ALGORITHM_DATA: Record<string, unknown> = {};

export function parseAlgorithmData(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || raw.length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function mapUserCardState(
  row: LocalUserCardStateRecord & { algorithmData?: string | null },
): UserCardState {
  return {
    id: row.id,
    deckId: row.deckId,
    cardId: row.cardId,
    userId: row.userId,
    masteryLevel: Number(row.masteryLevel ?? DEFAULT_MASTERY_LEVEL),
    easeFactor: Number(row.easeFactor ?? DEFAULT_EASE_FACTOR),
    intervalDays: Number(row.intervalDays ?? DEFAULT_INTERVAL_DAYS),
    nextReviewAt: row.nextReviewAt,
    lastReviewedAt: row.lastReviewedAt,
    isBookmarked: Number(row.isBookmarked ?? 0) === 1,
    algorithmData: parseAlgorithmData(row.algorithmData),
    updatedAt: row.updatedAt,
  };
}

export function buildPreviousSrsState(
  row:
    | {
        mastery_level: number;
        ease_factor: number;
        interval_days: number;
        next_review_at: string | null;
        last_reviewed_at: string | null;
        algorithm_data: string | null;
      }
    | null
    | undefined,
): CardSrsState {
  return {
    masteryLevel: Number(row?.mastery_level ?? DEFAULT_MASTERY_LEVEL),
    easeFactor: Number(row?.ease_factor ?? DEFAULT_EASE_FACTOR),
    intervalDays: Number(row?.interval_days ?? DEFAULT_INTERVAL_DAYS),
    nextReviewAt: row?.next_review_at ?? null,
    lastReviewedAt: row?.last_reviewed_at ?? null,
    algorithmData: parseAlgorithmData(row?.algorithm_data),
  };
}

export function parseSrsStateSnapshot(raw: unknown): CardSrsState {
  if (typeof raw !== "string" || raw.length === 0) {
    return buildPreviousSrsState(null);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CardSrsState>;
    return {
      masteryLevel: Number(parsed.masteryLevel ?? DEFAULT_MASTERY_LEVEL),
      easeFactor: Number(parsed.easeFactor ?? DEFAULT_EASE_FACTOR),
      intervalDays: Number(parsed.intervalDays ?? DEFAULT_INTERVAL_DAYS),
      nextReviewAt: typeof parsed.nextReviewAt === "string" ? parsed.nextReviewAt : null,
      lastReviewedAt:
        typeof parsed.lastReviewedAt === "string" ? parsed.lastReviewedAt : null,
      algorithmData:
        parsed.algorithmData && typeof parsed.algorithmData === "object"
          ? parsed.algorithmData
          : {},
    };
  } catch {
    return buildPreviousSrsState(null);
  }
}

export function serializeSrsStateSnapshot(state: CardSrsState): string {
  return JSON.stringify({
    masteryLevel: state.masteryLevel,
    easeFactor: state.easeFactor,
    intervalDays: state.intervalDays,
    nextReviewAt: state.nextReviewAt,
    lastReviewedAt: state.lastReviewedAt,
    algorithmData: state.algorithmData,
  });
}
