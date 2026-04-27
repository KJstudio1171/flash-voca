import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppError } from "@/src/core/errors";
import { SessionCompleteCard } from "@/src/features/study/components/SessionCompleteCard";
import { StudyFlashcard } from "@/src/features/study/components/StudyFlashcard";
import { StudyHeader } from "@/src/features/study/components/StudyHeader";
import {
  useRecordReviewMutation,
  useStudyDeckQuery,
} from "@/src/features/study/hooks/useStudyQueries";
import { useStudySession } from "@/src/features/study/hooks/useStudySession";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { Badge } from "@/src/shared/ui/Badge";
import { CardSurface } from "@/src/shared/ui/CardSurface";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function StudyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
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
    <AppScreenFrame
      contentStyle={styles.screenContent}
      scroll={false}
      headerSlot={
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <HeaderIconButton iconName="close" onPress={() => router.back()} />
          <Text numberOfLines={1} style={[styles.topTitle, { color: colors.ink }]}>
            {snapshot?.deck.title ?? t("study.title")}
          </Text>
          <HeaderIconButton iconName="cog-outline" onPress={() => router.push("/settings")} />
        </View>
      }
    >
      {hasSnapshot ? (
        <AnimatedScreen>
          <StudyHeader currentIndex={session.currentIndex} totalCards={session.totalCards} />
        </AnimatedScreen>
      ) : null}

      {studyQuery.isLoading && !hasSnapshot ? (
        <CardSurface>
          <Badge tone="info">{t("study.loadingBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>{t("study.loadingBody")}</Text>
        </CardSurface>
      ) : null}

      {studyQuery.isError ? (
        <CardSurface>
          <Badge tone="accent">{t("study.errorBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {studyQuery.error instanceof AppError
              ? studyQuery.error.userMessage
              : t("study.errorBody")}
          </Text>
        </CardSurface>
      ) : null}

      {showEmptyState ? (
        <CardSurface>
          <Badge tone="info">{t("study.emptyBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>{t("study.emptyBody")}</Text>
        </CardSurface>
      ) : null}

      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          disabled={session.isTransitioning}
          labels={{
            tapToReveal: t("study.tapToReveal"),
            again: t("study.ratings.again"),
            againSub: t("study.ratings.againSub"),
            good: t("study.ratings.good"),
            goodSub: t("study.ratings.goodSub"),
            easy: t("study.ratings.easy"),
            easySub: t("study.ratings.easySub"),
            swipeHint: t("study.swipeHint"),
            listen: t("study.listen"),
          }}
          onRate={session.rateCard}
        />
      ) : null}

      {session.completed ? (
        <SessionCompleteCard
          masteredCount={snapshot?.masteredCount ?? 0}
          onRestart={session.restartSession}
          ratingCounts={session.ratingCounts}
          totalCards={session.totalCards}
        />
      ) : null}
    </AppScreenFrame>
  );
}

function HeaderIconButton({
  iconName,
  onPress,
}: {
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        { opacity: pressed ? 0.55 : 1 },
      ]}
    >
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={32} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: tokens.spacing.l,
  },
  topTitle: {
    ...tokens.typography.heading,
    flex: 1,
    textAlign: "center",
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  screenContent: {
    gap: tokens.spacing.l,
    paddingTop: tokens.spacing.l,
  },
  body: {
    ...tokens.typography.body,
  },
});
