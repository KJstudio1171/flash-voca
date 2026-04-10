import { useCallback, useEffect, useRef, useState } from "react";

import { LogReviewInput, StudyCard } from "@/src/core/domain/models";

type StudyRating = 1 | 2 | 3;

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
  const startedAtRef = useRef(Date.now());

  const currentCard = cards[currentIndex] ?? null;
  const completed = cards.length > 0 && currentIndex >= cards.length;

  const restartSession = useCallback(() => {
    actionLockRef.current = false;
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

      setRatingCounts((prev) => ({
        ...prev,
        ...(rating === 1 && { again: prev.again + 1 }),
        ...(rating === 2 && { good: prev.good + 1 }),
        ...(rating === 3 && { easy: prev.easy + 1 }),
      }));

      recordReview({
        deckId,
        cardId: activeCard.card.id,
        rating,
        elapsedMs: Math.max(0, Date.now() - startedAtRef.current),
      });

      setCurrentIndex((value) => value + 1);
    },
    [cards, currentIndex, deckId, recordReview],
  );

  return {
    completed,
    currentCard,
    currentIndex,
    isTransitioning,
    rateCard,
    ratingCounts,
    restartSession,
    totalCards: cards.length,
  };
}
