import { useCallback, useEffect, useRef, useState } from "react";

import { LogReviewInput, ReviewRating, StudyCard } from "@/src/core/domain/models";

type StudyRating = 1 | 2 | 3;
type StudySessionAction =
  | { type: "rating"; index: number; rating: StudyRating }
  | { type: "skip"; index: number };

const STUDY_RATING_MAP: Record<StudyRating, ReviewRating> = {
  1: "again",
  2: "good",
  3: "easy",
};

type UseStudySessionOptions = {
  deckId: string;
  cards: StudyCard[];
  recordReview: (input: LogReviewInput) => void;
};

export function useStudySession({
  deckId,
  cards,
  recordReview,
}: UseStudySessionOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ratingCounts, setRatingCounts] = useState({ again: 0, good: 0, easy: 0 });
  const actionLockRef = useRef(false);
  const actionHistoryRef = useRef<StudySessionAction[]>([]);
  const startedAtRef = useRef(Date.now());

  const currentCard = cards[currentIndex] ?? null;
  const completed = cards.length > 0 && currentIndex >= cards.length;

  const restartSession = useCallback(() => {
    actionLockRef.current = false;
    actionHistoryRef.current = [];
    startedAtRef.current = Date.now();
    setCurrentIndex(0);
    setIsTransitioning(false);
    setRatingCounts({ again: 0, good: 0, easy: 0 });
  }, []);

  useEffect(() => {
    restartSession();
  }, [deckId, restartSession]);

  useEffect(() => {
    actionLockRef.current = false;
    startedAtRef.current = Date.now();
    setIsTransitioning(false);
  }, [currentCard?.card.id]);

  const rateCard = useCallback(
    (rating: StudyRating) => {
      const activeCard = cards[currentIndex];

      if (!activeCard || actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setIsTransitioning(true);
      actionHistoryRef.current.push({ type: "rating", index: currentIndex, rating });

      setRatingCounts((prev) => ({
        ...prev,
        ...(rating === 1 && { again: prev.again + 1 }),
        ...(rating === 2 && { good: prev.good + 1 }),
        ...(rating === 3 && { easy: prev.easy + 1 }),
      }));

      recordReview({
        deckId,
        cardId: activeCard.card.id,
        rating: STUDY_RATING_MAP[rating],
        elapsedMs: Math.max(0, Date.now() - startedAtRef.current),
      });

      setCurrentIndex((value) => value + 1);
    },
    [cards, currentIndex, deckId, recordReview],
  );

  const skipCard = useCallback(() => {
    const activeCard = cards[currentIndex];

    if (!activeCard || actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setIsTransitioning(true);
    actionHistoryRef.current.push({ type: "skip", index: currentIndex });
    setCurrentIndex((value) => value + 1);
  }, [cards, currentIndex]);

  const undoLastRatedCard = useCallback(() => {
    let ratingActionIndex = -1;
    for (let index = actionHistoryRef.current.length - 1; index >= 0; index -= 1) {
      if (actionHistoryRef.current[index].type === "rating") {
        ratingActionIndex = index;
        break;
      }
    }
    const ratingAction = actionHistoryRef.current[ratingActionIndex];

    if (!ratingAction || ratingAction.type !== "rating") {
      return false;
    }

    actionHistoryRef.current.splice(ratingActionIndex, 1);
    actionLockRef.current = false;
    startedAtRef.current = Date.now();
    setIsTransitioning(false);
    setCurrentIndex(ratingAction.index);
    setRatingCounts((prev) => ({
      again: ratingAction.rating === 1 ? Math.max(0, prev.again - 1) : prev.again,
      good: ratingAction.rating === 2 ? Math.max(0, prev.good - 1) : prev.good,
      easy: ratingAction.rating === 3 ? Math.max(0, prev.easy - 1) : prev.easy,
    }));

    return true;
  }, []);

  return {
    completed,
    currentCard,
    currentIndex,
    isTransitioning,
    rateCard,
    ratingCounts,
    restartSession,
    skipCard,
    totalCards: cards.length,
    undoLastRatedCard,
  };
}
