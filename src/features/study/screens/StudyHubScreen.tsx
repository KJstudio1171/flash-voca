import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { DeckSummary } from "@/src/core/domain/models";
import { useDeckSummaryListQuery } from "@/src/features/home/hooks/useHomeSummaryQuery";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";
import { QuickAction, QuickActions } from "@/src/shared/ui/QuickActions";
import { ScreenSection } from "@/src/shared/ui/ScreenSection";

export default function StudyHubScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const summaryQuery = useDeckSummaryListQuery();
  const decks = summaryQuery.data ?? [];
  const featuredDeck = findFeaturedDeck(decks);
  const totals = buildTotals(decks);
  const progress = totals.cardCount > 0 ? totals.masteredCount / totals.cardCount : 0;

  const startFeaturedStudy = () => {
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
      id: "review",
      label: t("studyHub.quick.review"),
      iconName: "clock-plus-outline",
      tone: "primary",
      onPress: startFeaturedStudy,
    },
    {
      id: "random",
      label: t("studyHub.quick.random"),
      iconName: "shuffle-variant",
      tone: "info",
      onPress: startFeaturedStudy,
    },
    {
      id: "decks",
      label: t("studyHub.quick.decks"),
      iconName: "text-box-multiple-outline",
      tone: "info",
      onPress: () => router.push("/decks"),
    },
    {
      id: "store",
      label: t("studyHub.quick.store"),
      iconName: "shopping-outline",
      tone: "accent",
      onPress: () => router.push("/store"),
    },
  ];

  return (
    <AppScreenFrame bottomInset="tabs">
      <AnimatedScreen style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {t("studyHub.eyebrow")}
        </Text>
        <Text style={[styles.title, { color: colors.ink }]}>{t("studyHub.title")}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t("studyHub.subtitle")}
        </Text>
      </AnimatedScreen>

      <AnimatedScreen delay={80} style={styles.content}>
        <CardSurface elevation="card" style={styles.summaryPanel}>
          <View style={styles.summaryCopy}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {t("studyHub.todayTitle")}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.muted }]}>
              {t("studyHub.todayMeta", {
                due: totals.dueCount,
                decks: decks.length,
              })}
            </Text>
            <AppButton
              disabled={summaryQuery.isLoading}
              onPress={startFeaturedStudy}
              style={styles.primaryAction}
            >
              {featuredDeck ? t("studyHub.start") : t("studyHub.createDeck")}
            </AppButton>
          </View>
          <CircularProgress
            color={colors.primary}
            progress={progress}
            size={96}
            strokeWidth={9}
          />
        </CardSurface>

        {featuredDeck ? (
          <CardSurface elevation="soft" style={styles.featuredPanel}>
            <View style={styles.featuredHeader}>
              <View style={[styles.deckIcon, { backgroundColor: featuredDeck.accentColor }]}>
                <MaterialCommunityIcons
                  color={colors.onPrimary}
                  name="cards-outline"
                  size={28}
                />
              </View>
              <View style={styles.featuredCopy}>
                <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                  {t("studyHub.continueTitle")}
                </Text>
                <Text numberOfLines={1} style={[styles.deckTitle, { color: colors.ink }]}>
                  {featuredDeck.title}
                </Text>
                <Text style={[styles.summaryMeta, { color: colors.muted }]}>
                  {t("studyHub.deckMeta", {
                    cards: featuredDeck.cardCount,
                    due: featuredDeck.dueCount,
                  })}
                </Text>
              </View>
            </View>
            <AppButton onPress={startFeaturedStudy} variant="secondary">
              {t("studyHub.continueAction")}
            </AppButton>
          </CardSurface>
        ) : (
          <CardSurface elevation="soft" style={styles.featuredPanel}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {t("studyHub.emptyTitle")}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.muted }]}>
              {t("studyHub.emptyBody")}
            </Text>
            <AppButton onPress={startFeaturedStudy}>{t("studyHub.createDeck")}</AppButton>
          </CardSurface>
        )}

        <ScreenSection title={t("studyHub.quickTitle")}>
          <QuickActions actions={quickActions} />
        </ScreenSection>
      </AnimatedScreen>
    </AppScreenFrame>
  );
}

function findFeaturedDeck(decks: DeckSummary[]): DeckSummary | null {
  if (decks.length === 0) return null;
  return [...decks].sort((left, right) => right.dueCount - left.dueCount)[0] ?? null;
}

function buildTotals(decks: DeckSummary[]) {
  return decks.reduce(
    (total, deck) => ({
      cardCount: total.cardCount + deck.cardCount,
      dueCount: total.dueCount + deck.dueCount,
      masteredCount: total.masteredCount + deck.masteredCount,
    }),
    { cardCount: 0, dueCount: 0, masteredCount: 0 },
  );
}

const styles = StyleSheet.create({
  header: {
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xl,
  },
  eyebrow: {
    ...tokens.typography.bodyBold,
  },
  title: {
    ...tokens.typography.pageTitleLarge,
  },
  subtitle: {
    ...tokens.typography.body,
  },
  content: {
    gap: tokens.spacing.xl,
  },
  summaryPanel: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.l,
  },
  summaryCopy: {
    flex: 1,
    gap: tokens.spacing.s,
  },
  sectionTitle: {
    ...tokens.typography.heading,
  },
  summaryMeta: {
    ...tokens.typography.body,
  },
  primaryAction: {
    alignSelf: "flex-start",
    marginTop: tokens.spacing.s,
  },
  featuredPanel: {
    gap: tokens.spacing.m,
  },
  featuredHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.m,
  },
  deckIcon: {
    alignItems: "center",
    borderRadius: tokens.radius.s,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  featuredCopy: {
    flex: 1,
    gap: 3,
  },
  deckTitle: {
    ...tokens.typography.bodyBold,
  },
});
