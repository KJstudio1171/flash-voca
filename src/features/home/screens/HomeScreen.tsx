import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HomeRecentActivityCard } from "@/src/features/home/components/HomeRecentActivityCard";
import { HomeRecommendedBundleCard } from "@/src/features/home/components/HomeRecommendedBundleCard";
import { HomeStudySummaryCard } from "@/src/features/home/components/HomeStudySummaryCard";
import { useHomeSummaryQuery } from "@/src/features/home/hooks/useHomeSummaryQuery";
import { DeckSummary } from "@/src/core/domain/models";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useFormat, useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { QuickAction, QuickActions } from "@/src/shared/ui/QuickActions";
import { ScreenSection } from "@/src/shared/ui/ScreenSection";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const format = useFormat();
  const summaryQuery = useHomeSummaryQuery();
  const homeSummary = summaryQuery.data;
  const decks = homeSummary?.decks ?? [];
  const featuredDeck = findFeaturedDeck(decks);
  const stats = homeSummary?.stats ?? createEmptyHomeStats();
  const recentActivities =
    homeSummary?.recentActivities.map((activity) => ({
      id: activity.id,
      title: activity.term,
      timeLabel: format.relative(activity.reviewedAt),
      resultLabel: getRatingLabel(activity.rating, t),
      resultTone: activity.rating <= 1 ? "again" as const : "good" as const,
      iconName: getRatingIconName(activity.rating),
    })) ?? [];

  const startStudy = () => {
    if (!featuredDeck) {
      router.push({
        pathname: "/decks/[deckId]/edit",
        params: { deckId: "new" },
      });
      return;
    }

    router.push({
      pathname: "/study/[deckId]",
      params: { deckId: featuredDeck.id },
    });
  };

  const quickActions: QuickAction[] = [
    {
      id: "decks",
      label: t("home.quickActions.myDecks"),
      iconName: "text-box-multiple-outline",
      tone: "info",
      onPress: () => router.push("/decks"),
    },
    {
      id: "review",
      label: t("home.quickActions.review", { count: stats.dueCount }),
      iconName: "clock-plus-outline",
      tone: "primary",
      onPress: startStudy,
    },
    {
      id: "random",
      label: t("home.quickActions.randomStudy"),
      iconName: "shuffle-variant",
      tone: "info",
      onPress: startStudy,
    },
    {
      id: "stats",
      label: t("home.quickActions.stats"),
      iconName: "chart-bar",
      tone: "accent",
      onPress: () => router.push("/profile"),
    },
  ];

  return (
    <AppScreenFrame bottomInset="tabs" contentStyle={styles.screenContent}>
      <AnimatedScreen style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.greeting, { color: colors.muted }]}>
            {t("home.greeting")}
          </Text>
          <Text style={[styles.title, { color: colors.ink }]}>{t("home.title")}</Text>
        </View>
        <View style={styles.headerActions}>
          <HeaderIconButton
            iconName="bell-badge-outline"
            onPress={() => router.push("/profile")}
          />
          <HeaderIconButton iconName="cog-outline" onPress={() => router.push("/settings")} />
        </View>
      </AnimatedScreen>

      <AnimatedScreen delay={60} style={styles.content}>
        <HomeStudySummaryCard
          labels={{
            progressLabel: t("home.summary.progressLabel"),
            studiedCards: t("home.summary.studiedCards"),
            studyTime: t("home.summary.studyTime"),
            streak: t("home.summary.streak"),
            minutesValue: t("home.summary.minutesValue", {
              count: stats.studyMinutes,
            }),
            daysValue: t("home.summary.daysValue", {
              count: stats.streakDays,
            }),
          }}
          progress={stats.progress}
          studiedCards={stats.studiedCards}
          totalCards={stats.totalCards}
        />

        <ScreenSection title={t("home.recommendedSection")}>
          <HomeRecommendedBundleCard
            actionLabel={t("home.recommended.action")}
            bookSub={t("home.recommended.bookSub")}
            bookTitle={t("home.recommended.bookTitle")}
            meta={t("home.recommended.meta")}
            onPress={() => router.push("/store")}
            title={t("home.recommended.title")}
          />
        </ScreenSection>

        <ScreenSection title={t("home.recentSection")}>
          <HomeRecentActivityCard
            emptyLabel={t("home.recent.empty")}
            items={recentActivities}
          />
        </ScreenSection>

        <ScreenSection title={t("home.quickSection")}>
          <QuickActions actions={quickActions} />
        </ScreenSection>
      </AnimatedScreen>
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
        styles.headerIconButton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={24} />
    </Pressable>
  );
}

function findFeaturedDeck(decks: DeckSummary[]): DeckSummary | null {
  if (decks.length === 0) return null;
  return [...decks].sort((a, b) => b.dueCount - a.dueCount)[0] ?? null;
}

function createEmptyHomeStats() {
  return {
    totalCards: 0,
    studiedCards: 0,
    progress: 0,
    studyMinutes: 0,
    streakDays: 0,
    dueCount: 0,
    recentActivities: [],
  };
}

function getRatingLabel(rating: number, t: ReturnType<typeof useT>["t"]) {
  if (rating <= 1) return t("study.ratings.again");
  if (rating === 2) return t("study.ratings.good");
  return t("study.ratings.easy");
}

function getRatingIconName(
  rating: number,
): ComponentProps<typeof MaterialCommunityIcons>["name"] {
  if (rating <= 1) return "help-circle-outline";
  if (rating === 2) return "check-circle-outline";
  return "star-circle-outline";
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: tokens.spacing.m,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: tokens.spacing.l,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    ...tokens.typography.bodyBold,
  },
  title: {
    ...tokens.typography.pageTitle,
  },
  headerActions: {
    flexDirection: "row",
    gap: tokens.spacing.s,
    paddingTop: 4,
  },
  headerIconButton: {
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.borderWidth.hairline,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  content: {
    gap: tokens.spacing.xl,
  },
});
