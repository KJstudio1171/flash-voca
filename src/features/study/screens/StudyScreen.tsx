import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LogReviewInput } from "@/src/core/domain/models";
import { StudyFlashcard } from "@/src/features/study/components/StudyFlashcard";
import { StudyRatingBar } from "@/src/features/study/components/StudyRatingBar";
import {
  useRecordReviewMutation,
  useStudyDeckQuery,
} from "@/src/features/study/hooks/useStudyQueries";
import { useStudySession } from "@/src/features/study/hooks/useStudySession";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function StudyScreen() {
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const studyQuery = useStudyDeckQuery(deckId);
  const reviewMutation = useRecordReviewMutation(deckId);
  const snapshot = studyQuery.data;
  const cards = snapshot?.cards ?? [];

  const recordReview = useCallback(
    ({
      input,
      onError,
    }: {
      input: LogReviewInput;
      onError?: (error: Error) => void;
    }) => {
      reviewMutation.mutate(input, {
        onError: (error) => {
          const normalizedError =
            error instanceof Error ? error : new Error("Failed to save study result.");
          onError?.(normalizedError);
        },
      });
    },
    [reviewMutation],
  );

  const session = useStudySession({
    deckId,
    cards,
    recordReview,
  });

  const currentCard = session.currentCard;
  const hasSnapshot = snapshot != null;
  const showEmptyState = !studyQuery.isLoading && hasSnapshot && cards.length === 0;

  return (
    <Screen
      contentStyle={styles.content}
      scroll={false}
      subtitle="Tap to flip, swipe to rate, or use Again/Good/Easy. Reviews are stored locally first."
      title={snapshot?.deck.title ?? "Study"}
    >
      <View style={styles.metrics}>
        <Panel style={styles.metricCard}>
          <Text style={styles.metricValue}>{snapshot?.dueCount ?? 0}</Text>
          <Text style={styles.metricLabel}>due now</Text>
        </Panel>
        <Panel style={styles.metricCard}>
          <Text style={styles.metricValue}>{snapshot?.masteredCount ?? 0}</Text>
          <Text style={styles.metricLabel}>mastered</Text>
        </Panel>
      </View>

      {studyQuery.isLoading && !hasSnapshot ? (
        <Panel>
          <Badge tone="info">Loading</Badge>
          <Text style={styles.body}>Preparing a local study session from SQLite.</Text>
        </Panel>
      ) : null}

      {studyQuery.isError ? (
        <Panel accentColor={tokens.colors.accent}>
          <Badge tone="accent">Error</Badge>
          <Text style={styles.sectionTitle}>Study session unavailable</Text>
          <Text style={styles.body}>
            {studyQuery.error instanceof Error
              ? studyQuery.error.message
              : "Failed to load the study snapshot."}
          </Text>
        </Panel>
      ) : null}

      {showEmptyState ? (
        <Panel>
          <Badge tone="info">Empty</Badge>
          <Text style={styles.sectionTitle}>No cards to study</Text>
          <Text style={styles.body}>
            Add cards to this deck first, then come back to run a local practice session.
          </Text>
        </Panel>
      ) : null}

      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          currentIndex={session.currentIndex}
          disabled={session.isTransitioning}
          onRate={session.rateCard}
          totalCards={session.totalCards}
        />
      ) : null}

      {currentCard ? (
        <Panel>
          <Badge tone="primary">Rate</Badge>
          <Text style={styles.body}>
            Button input and swipe gestures use the same review pipeline, then move to the
            next card immediately.
          </Text>
          <StudyRatingBar
            disabled={session.isTransitioning}
            onAgain={() => {
              session.rateCard(1);
            }}
            onEasy={() => {
              session.rateCard(3);
            }}
            onGood={() => {
              session.rateCard(2);
            }}
          />
        </Panel>
      ) : null}

      {session.lastError ? (
        <Panel accentColor={tokens.colors.accent}>
          <Badge tone="accent">Save issue</Badge>
          <Text style={styles.body}>{session.lastError}</Text>
        </Panel>
      ) : null}

      {session.completed ? (
        <Panel accentColor={tokens.colors.primary}>
          <Badge tone="primary">Complete</Badge>
          <Text style={styles.sectionTitle}>Session finished</Text>
          <Text style={styles.body}>
            The full dummy deck has been processed. Each rating request writes to
            `local_review_logs` and updates `local_user_card_states`.
          </Text>
          <Text style={styles.body}>
            Background invalidation refreshes the snapshot after each local write, so the
            next session starts with up-to-date state.
          </Text>
          <AppButton onPress={session.restartSession}>Restart session</AppButton>
        </Panel>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.spacing.l,
  },
  metrics: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  metricCard: {
    flex: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  metricLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: tokens.colors.muted,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.colors.muted,
  },
});
