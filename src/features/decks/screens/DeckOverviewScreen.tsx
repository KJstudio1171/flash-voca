import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppError } from "@/src/core/errors";
import { useDeckDetailQuery } from "@/src/features/decks/hooks/useDeckQueries";
import { useFormat, useT } from "@/src/shared/i18n";
import type { TranslationKey } from "@/src/shared/i18n/types";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { Badge } from "@/src/shared/ui/Badge";
import { CardSurface } from "@/src/shared/ui/CardSurface";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function DeckOverviewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const format = useFormat();
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const deckQuery = useDeckDetailQuery(deckId);
  const deck = deckQuery.data;
  const learnedCount = deck?.cards.filter((card) => card.difficulty === "easy").length ?? 0;
  const hardCount = deck?.cards.filter((card) => card.difficulty === "hard").length ?? 0;
  const pendingCount = Math.max((deck?.cardCount ?? 0) - learnedCount, 0);

  return (
    <AppScreenFrame
      bottomInset="none"
      contentStyle={styles.content}
      headerSlot={
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <HeaderIconButton iconName="chevron-left" onPress={() => router.back()} />
          <Text numberOfLines={1} style={[styles.topTitle, { color: colors.ink }]}>
            {deck?.title ?? t("deckOverview.fallbackTitle")}
          </Text>
          <HeaderIconButton
            iconName="dots-horizontal"
            onPress={() =>
              router.push({ pathname: "/decks/[deckId]/edit", params: { deckId } })
            }
          />
        </View>
      }
    >
      {deckQuery.isLoading ? (
        <CardSurface>
          <Badge tone="info">{t("deckOverview.loadingBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("deckOverview.loadingBody")}
          </Text>
        </CardSurface>
      ) : null}

      {deckQuery.isError ? (
        <CardSurface>
          <Badge tone="accent">{t("deckOverview.errorBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {deckQuery.error instanceof AppError
              ? deckQuery.error.userMessage
              : t("deckOverview.errorBody")}
          </Text>
        </CardSurface>
      ) : null}

      {deck ? (
        <>
          <CardSurface elevation="soft" style={styles.heroCard}>
            <DeckCover accentColor={deck.accentColor} title={deck.title} />
            <View style={styles.heroCopy}>
              <Text numberOfLines={2} style={[styles.heroTitle, { color: colors.ink }]}>
                {deck.title}
              </Text>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                {t("deckOverview.meta", {
                  count: deck.cardCount,
                  source: deck.sourceLanguage,
                  target: deck.targetLanguage,
                  visibility:
                    deck.visibility === "private"
                      ? t("deckOverview.private")
                      : t("deckOverview.public"),
                })}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <AppButton
                onPress={() =>
                  router.push({ pathname: "/study/[deckId]", params: { deckId: deck.id } })
                }
                style={styles.primaryAction}
              >
                {t("deckOverview.study")}
              </AppButton>
              <AppButton
                onPress={() => router.push(`/decks/${deck.id}/cards` as never)}
                style={styles.secondaryAction}
                variant="secondary"
              >
                {t("deckOverview.manageCards")}
              </AppButton>
              <AppButton
                onPress={() =>
                  router.push({ pathname: "/decks/[deckId]/edit", params: { deckId: deck.id } })
                }
                style={styles.secondaryAction}
                variant="secondary"
              >
                {t("deckOverview.settings")}
              </AppButton>
            </View>
          </CardSurface>

          <View style={styles.statsRow}>
            <StatCard iconName="card-text-outline" label={t("deckOverview.learnedCards")} value={learnedCount} />
            <StatCard iconName="clock-outline" label={t("deckOverview.pendingReview")} value={pendingCount} />
            <StatCard iconName="alert-outline" label={t("deckOverview.hardCards")} value={hardCount} />
          </View>

          <CardSurface elevation="soft" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {t("deckOverview.deckInfo")}
            </Text>
            <InfoRow label={t("deckOverview.lastUpdated")} value={format.date(deck.updatedAt)} />
            <InfoRow label={t("deckOverview.createdAt")} value={format.date(deck.createdAt)} />
            <InfoRow label={t("deckOverview.cardCount")} value={`${deck.cardCount}`} />
            <InfoRow label={t("deckOverview.languageDirection")} value={`${deck.sourceLanguage} → ${deck.targetLanguage}`} />
          </CardSurface>

          <CardSurface elevation="soft" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {t("deckOverview.recentActivity")}
            </Text>
            {deck.activities.length > 0 ? (
              deck.activities.slice(0, 4).map((activity) => (
                <View key={activity.id} style={styles.activityRow}>
                  <MaterialCommunityIcons
                    color={colors.primary}
                    name={activityIconByType[activity.activityType]}
                    size={22}
                  />
                  <Text style={[styles.activityText, { color: colors.ink }]}>
                    {t(activityMessageKeyByType[activity.activityType], {
                      term: activity.summary,
                    })}
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.muted }]}>
                    {format.date(activity.createdAt)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.body, { color: colors.muted }]}>
                {t("deckOverview.emptyActivity")}
              </Text>
            )}
          </CardSurface>
        </>
      ) : null}
    </AppScreenFrame>
  );
}

const activityIconByType = {
  card_added: "plus-box-outline",
  card_updated: "pencil-box-outline",
  card_deleted: "trash-can-outline",
  deck_updated: "sync",
} satisfies Record<string, ComponentProps<typeof MaterialCommunityIcons>["name"]>;

const activityMessageKeyByType = {
  card_added: "deckOverview.activity.cardAdded",
  card_updated: "deckOverview.activity.cardUpdated",
  card_deleted: "deckOverview.activity.cardDeleted",
  deck_updated: "deckOverview.activity.deckUpdated",
} satisfies Record<string, TranslationKey>;

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
      style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={30} />
    </Pressable>
  );
}

function DeckCover({ accentColor, title }: { accentColor: string; title: string }) {
  const { colors } = useTheme();
  const coverTitle = title.split(/\s+/).filter(Boolean).slice(0, 3).join("\n").toUpperCase();
  return (
    <View style={[styles.cover, { backgroundColor: accentColor }]}>
      <Text numberOfLines={3} style={[styles.coverText, { color: colors.onPrimary }]}>
        {coverTitle}
      </Text>
      <MaterialCommunityIcons
        color={colors.overlayWhite}
        name="account-school-outline"
        size={34}
        style={styles.coverIcon}
      />
    </View>
  );
}

function StatCard({
  iconName,
  label,
  value,
}: {
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: number;
}) {
  const { colors } = useTheme();
  return (
    <CardSurface elevation="soft" padding="m" style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialCommunityIcons color={colors.primary} name={iconName} size={22} />
      </View>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
    </CardSurface>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.body, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.body, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: tokens.spacing.m,
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
  content: {
    gap: tokens.spacing.l,
  },
  heroCard: {
    gap: tokens.spacing.m,
  },
  cover: {
    borderRadius: tokens.radius.m,
    height: 126,
    overflow: "hidden",
    padding: tokens.spacing.m,
    width: 126,
  },
  coverText: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 19,
  },
  coverIcon: {
    bottom: 12,
    position: "absolute",
    right: 12,
  },
  heroCopy: {
    gap: tokens.spacing.xs,
  },
  heroTitle: {
    ...tokens.typography.heading,
  },
  metaText: {
    ...tokens.typography.body,
  },
  actionRow: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  primaryAction: {
    flex: 1.1,
    paddingHorizontal: tokens.spacing.s,
  },
  secondaryAction: {
    flex: 1,
    paddingHorizontal: tokens.spacing.s,
  },
  statsRow: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
    gap: tokens.spacing.xs,
  },
  statIcon: {
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  statLabel: {
    ...tokens.typography.caption,
    textAlign: "center",
  },
  statValue: {
    ...tokens.typography.heading,
  },
  section: {
    gap: tokens.spacing.s,
  },
  sectionTitle: {
    ...tokens.typography.subheading,
  },
  body: {
    ...tokens.typography.body,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: tokens.spacing.m,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
    minHeight: 34,
  },
  activityText: {
    ...tokens.typography.body,
    flex: 1,
  },
  activityTime: {
    ...tokens.typography.caption,
  },
});
