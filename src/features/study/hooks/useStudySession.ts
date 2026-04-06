import { useCallback, useEffect, useRef, useState } from "react";

import { LogReviewInput, StudyCard } from "@/src/core/domain/models";

type StudyRating = 1 | 2 | 3;

type RecordReviewParams = {
  input: LogReviewInput;
  onError?: (error: Error) => void;
};

type UseStudySessionOptions = {
  deckId: string;
  cards: StudyCard[];
  recordReview: (params: RecordReviewParams) => void;
};

export function useStudySession({
  deckId,
  cards,
  recordReview,
}: UseStudySessionOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const actionLockRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  const currentCard = cards[currentIndex] ?? null;
  const completed = cards.length > 0 && currentIndex >= cards.length;

  const restartSession = useCallback(() => {
    actionLockRef.current = false;
    startedAtRef.current = Date.now();
    setCurrentIndex(0);
    setIsTransitioning(false);
    setLastError(null);
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
      setLastError(null);

      recordReview({
        input: {
          deckId,
          cardId: activeCard.card.id,
          rating,
          elapsedMs: Math.max(0, Date.now() - startedAtRef.current),
        },
        onError: (error) => {
          actionLockRef.current = false;
          setIsTransitioning(false);
          setLastError(error.message);
        },
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
    lastError,
    rateCard,
    restartSession,
    totalCards: cards.length,
  };
}
