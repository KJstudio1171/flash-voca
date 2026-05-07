import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ComponentProps, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppError } from "@/src/core/errors";
import { SessionCompleteCard } from "@/src/features/study/components/SessionCompleteCard";
import { StudyFlashcard } from "@/src/features/study/components/StudyFlashcard";
import { StudyHeader } from "@/src/features/study/components/StudyHeader";
import {
  useRecordReviewMutation,
  useStudyDeckQuery,
  useToggleBookmarkMutation,
  useUndoLastReviewMutation,
} from "@/src/features/study/hooks/useStudyQueries";
import { useStudySession } from "@/src/features/study/hooks/useStudySession";
import { useStudyPreferences } from "@/src/features/study/preferences/StudyPreferencesProvider";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { Badge } from "@/src/shared/ui/Badge";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { useToast } from "@/src/shared/ui/toast";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function StudyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const toast = useToast();
  const { allowFrontSwipe, interactionMode } = useStudyPreferences();
  const [menuVisible, setMenuVisible] = useState(false);
  const params = useLocalSearchParams<{
    deckId: string | string[];
    mode?: string | string[];
  }>();
  const deckId = getParamValue(params.deckId);
  const studyMode = getParamValue(params.mode);
  const isBookmarkedMode = studyMode === "bookmarked";
  const studyQuery = useStudyDeckQuery(deckId);
  const reviewMutation = useRecordReviewMutation(deckId);
  const bookmarkMutation = useToggleBookmarkMutation(deckId);
  const undoMutation = useUndoLastReviewMutation(deckId);
  const snapshot = studyQuery.data;
  const cards = isBookmarkedMode
    ? (snapshot?.cards.filter((card) => card.state?.isBookmarked) ?? [])
    : (snapshot?.cards ?? []);

  const session = useStudySession({
    deckId,
    cards,
    recordReview: reviewMutation.mutate,
  });

  const currentCard = session.currentCard;
  const hasSnapshot = snapshot != null;
  const showEmptyState = !studyQuery.isLoading && hasSnapshot && cards.length === 0;
  const displayIndex =
    session.totalCards > 0
      ? Math.min(session.currentIndex + (currentCard ? 1 : 0), session.totalCards)
      : 0;
  const enableSwipe = interactionMode !== "button_only";
  const showRatingButtons = interactionMode !== "swipe_only";

  const toggleBookmark = () => {
    if (!currentCard || bookmarkMutation.isPending) {
      return;
    }

    const nextValue = !(currentCard.state?.isBookmarked ?? false);
    bookmarkMutation.mutate(
      { cardId: currentCard.card.id, isBookmarked: nextValue },
      {
        onSuccess: () => {
          toast.show(
            nextValue ? t("study.menu.bookmarkSaved") : t("study.menu.bookmarkRemoved"),
          );
        },
      },
    );
  };

  const undoLastReview = () => {
    if (undoMutation.isPending) {
      return;
    }

    const restoredInSession = session.undoLastRatedCard();
    undoMutation.mutate(undefined, {
      onSuccess: (didUndo) => {
        if (didUndo) {
          toast.show(t("study.menu.undoComplete"));
          return;
        }
        if (!restoredInSession) {
          toast.show(t("study.menu.undoUnavailable"));
        }
      },
    });
  };

  return (
    <AppScreenFrame
      contentStyle={styles.screenContent}
      scroll={false}
      headerSlot={
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <HeaderIconButton iconName="chevron-left" onPress={() => router.back()} />
          <Text numberOfLines={1} style={[styles.topTitle, { color: colors.ink }]}>
            {displayIndex} / {session.totalCards || (isBookmarkedMode ? 0 : snapshot?.deck.cardCount) || 0}
          </Text>
          <HeaderIconButton
            iconName="dots-horizontal"
            onPress={() => setMenuVisible(true)}
          />
        </View>
      }
    >
      {hasSnapshot ? (
        <AnimatedScreen variant="none">
          <StudyHeader currentIndex={displayIndex} totalCards={session.totalCards} />
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
          <Text style={[styles.body, { color: colors.muted }]}>
            {isBookmarkedMode ? t("study.emptyBookmarkedBody") : t("study.emptyBody")}
          </Text>
        </CardSurface>
      ) : null}

      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          cardState={{
            masteryLevel: currentCard.state?.masteryLevel ?? 0,
            easeFactor: currentCard.state?.easeFactor ?? 2.5,
            intervalDays: currentCard.state?.intervalDays ?? 0,
            nextReviewAt: currentCard.state?.nextReviewAt ?? null,
            lastReviewedAt: currentCard.state?.lastReviewedAt ?? null,
            algorithmData: currentCard.state?.algorithmData ?? {},
          }}
          allowFrontSwipe={allowFrontSwipe}
          disabled={session.isTransitioning}
          enableSwipe={enableSwipe}
          isBookmarked={currentCard.state?.isBookmarked ?? false}
          labels={{
            tapToReveal: t("study.tapToReveal"),
            again: t("study.ratings.again"),
            good: t("study.ratings.good"),
            easy: t("study.ratings.easy"),
            swipeHint: t("study.swipeHint"),
            listen: t("study.listen"),
            example: t("study.example"),
            extraInfo: t("study.extraInfo"),
            synonyms: t("study.extra.synonyms"),
            relatedExpressions: t("study.extra.relatedExpressions"),
            memo: t("study.extra.memo"),
          }}
          onToggleBookmark={toggleBookmark}
          onRate={session.rateCard}
          showRatingButtons={showRatingButtons}
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

      <StudyMenu
        bookmarkLabel={
          currentCard?.state?.isBookmarked
            ? t("study.menu.removeBookmark")
            : t("study.menu.bookmark")
        }
        isBookmarked={currentCard?.state?.isBookmarked ?? false}
        onBookmark={toggleBookmark}
        onClose={() => setMenuVisible(false)}
        onOpenSettings={() => {
          setMenuVisible(false);
          router.push("/settings");
        }}
        onSkip={() => {
          setMenuVisible(false);
          session.skipCard();
        }}
        onUndo={undoLastReview}
        visible={menuVisible}
      />
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

function StudyMenu({
  onBookmark,
  bookmarkLabel,
  isBookmarked,
  onClose,
  onOpenSettings,
  onSkip,
  onUndo,
  visible,
}: {
  bookmarkLabel: string;
  isBookmarked: boolean;
  onBookmark: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onSkip: () => void;
  onUndo: () => void;
  visible: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useT();

  const items = [
    {
      iconName: "undo",
      label: t("study.menu.undo"),
      onPress: onUndo,
    },
    {
      iconName: "skip-next-outline",
      label: t("study.menu.skip"),
      onPress: onSkip,
    },
    {
      iconName: isBookmarked ? "bookmark" : "bookmark-outline",
      label: bookmarkLabel,
      onPress: onBookmark,
    },
    {
      iconName: "cog-outline",
      label: t("study.menu.settings"),
      onPress: onOpenSettings,
    },
  ] satisfies {
    iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
    label: string;
    onPress: () => void;
  }[];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View
          style={[
            styles.menuPanel,
            tokens.elevation.soft,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                index > 0 ? { borderTopColor: colors.line, borderTopWidth: 1 } : null,
                { opacity: pressed ? 0.68 : 1 },
              ]}
            >
              <MaterialCommunityIcons color={colors.muted} name={item.iconName} size={22} />
              <Text style={[styles.menuItemText, { color: colors.ink }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
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
    gap: tokens.spacing.m,
    paddingTop: tokens.spacing.s,
  },
  body: {
    ...tokens.typography.body,
  },
  menuOverlay: {
    flex: 1,
  },
  menuPanel: {
    borderRadius: tokens.radius.s,
    borderWidth: tokens.borderWidth.hairline,
    overflow: "hidden",
    position: "absolute",
    right: tokens.spacing.l,
    top: 76,
    width: 220,
  },
  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
    minHeight: 52,
    paddingHorizontal: tokens.spacing.m,
  },
  menuItemText: {
    ...tokens.typography.bodyBold,
    flex: 1,
  },
});
