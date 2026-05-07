import type {
  DeckSummary,
  StudyCard,
  UserCardState,
} from "@/src/core/domain/models";

export const MASTERED_MASTERY_LEVEL = 3;

export function isDueState(
  state: Pick<UserCardState, "nextReviewAt"> | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!state?.nextReviewAt) {
    return true;
  }

  return new Date(state.nextReviewAt).getTime() <= nowMs;
}

export function isMasteredState(
  state: Pick<UserCardState, "masteryLevel"> | null | undefined,
): boolean {
  return (state?.masteryLevel ?? 0) >= MASTERED_MASTERY_LEVEL;
}

export function countDeckSummaryDueCards(
  cardCount: number,
  states: Pick<UserCardState, "nextReviewAt">[],
  nowMs = Date.now(),
): number {
  const notDueCount = states.filter((state) => !isDueState(state, nowMs)).length;
  return cardCount - notDueCount;
}

export function countDeckSummaryMasteredCards(
  states: Pick<UserCardState, "masteryLevel">[],
): number {
  return states.filter(isMasteredState).length;
}

export function countStudyCardsDue(cards: StudyCard[], nowMs = Date.now()): number {
  return cards.filter((item) => isDueState(item.state, nowMs)).length;
}

export function countStudyCardsMastered(cards: StudyCard[]): number {
  return cards.filter((item) => isMasteredState(item.state)).length;
}

export function calculateHomeProgress(decks: DeckSummary[]): {
  totalCards: number;
  dueCount: number;
  progress: number;
} {
  const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  const masteredCards = decks.reduce((sum, deck) => sum + deck.masteredCount, 0);
  const dueCount = decks.reduce((sum, deck) => sum + deck.dueCount, 0);

  return {
    totalCards,
    dueCount,
    progress: totalCards > 0 ? masteredCards / totalCards : 0,
  };
}
