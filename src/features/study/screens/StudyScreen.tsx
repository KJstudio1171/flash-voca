import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppError } from "@/src/core/errors";
import { SessionCompleteCard } from "@/src/features/study/components/SessionCompleteCard";
import { StudyFlashcard } from "@/src/features/study/components/StudyFlashcard";
import { StudyHeader } from "@/src/features/study/components/StudyHeader";
import {
  useRecordReviewMutation,
  useStudyDeckQuery,
} from "@/src/features/study/hooks/useStudyQueries";
import { useStudySession } from "@/src/features/study/hooks/useStudySession";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function StudyScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const studyQuery = useStudyDeckQuery(deckId);
  const reviewMutation = useRecordReviewMutation(deckId);
  const snapshot = studyQuery.data;
  const cards = snapshot?.cards ?? [];

  const session = useStudySession({
    deckId,
    cards,
    recordReview: reviewMutation.mutate,
  });

  const currentCard = session.currentCard;
  const hasSnapshot = snapshot != null;
  const showEmptyState = !studyQuery.isLoading && hasSnapshot && cards.length === 0;

  return (
    <Screen
      contentStyle={styles.content}
      scroll={false}
      title={snapshot?.deck.title ?? "Study"}
    >
      {hasSnapshot ? (
        <StudyHeader
          deckTitle={snapshot.deck.title}
          currentIndex={session.currentIndex}
          totalCards={session.totalCards}
          dueCount={snapshot.dueCount}
          masteredCount={snapshot.masteredCount}
        />
      ) : null}

      {studyQuery.isLoading && !hasSnapshot ? (
        <Panel>
          <Badge tone="info">Loading</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>학습 세션을 준비하고 있습니다.</Text>
        </Panel>
      ) : null}

      {studyQuery.isError ? (
        <Panel>
          <Badge tone="accent">Error</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {studyQuery.error instanceof AppError
              ? studyQuery.error.userMessage
              : "학습 데이터를 불러올 수 없습니다."}
          </Text>
        </Panel>
      ) : null}

      {showEmptyState ? (
        <Panel>
          <Badge tone="info">Empty</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            카드가 없습니다. 먼저 카드를 추가한 후 다시 시도하세요.
          </Text>
        </Panel>
      ) : null}

      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          disabled={session.isTransitioning}
          onRate={session.rateCard}
        />
      ) : null}

      {session.completed ? (
        <SessionCompleteCard
          totalCards={session.totalCards}
          masteredCount={snapshot?.masteredCount ?? 0}
          ratingCounts={session.ratingCounts}
          onRestart={session.restartSession}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.spacing.l,
  },
  body: {
    ...tokens.typography.body,
  },
});
