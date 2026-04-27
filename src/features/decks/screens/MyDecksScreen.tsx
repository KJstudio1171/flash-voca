import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MyDeckListItem } from "@/src/features/decks/components/MyDeckListItem";
import { useDeckListQuery } from "@/src/features/decks/hooks/useDeckQueries";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { FloatingActionButton } from "@/src/shared/ui/FloatingActionButton";

export default function MyDecksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const deckQuery = useDeckListQuery();
  const decks = deckQuery.data ?? [];

  const openNewDeck = () =>
    router.push({
      pathname: "/decks/[deckId]/edit",
      params: { deckId: "new" },
    });

  return (
    <AppScreenFrame
      bottomInset="fab"
      floatingSlot={
        <View pointerEvents="box-none" style={styles.fabContainer}>
          <FloatingActionButton
            accessibilityLabel={t("decks.createDeck")}
            onPress={openNewDeck}
          />
        </View>
      }
    >
      <AnimatedScreen style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>{t("decks.title")}</Text>
        <View style={styles.subheader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            {t("decks.personalSection")}
          </Text>
          <Text style={[styles.freeHint, { color: colors.primary }]}>
            {t("decks.freeEditHint")}
          </Text>
        </View>
      </AnimatedScreen>

      <AnimatedScreen delay={80} style={styles.list}>
        {decks.length === 0 && !deckQuery.isLoading ? (
          <CardSurface elevation="soft" style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>
              {t("decks.emptyTitle")}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>
              {t("decks.emptyBody")}
            </Text>
          </CardSurface>
        ) : null}

        {decks.map((deck, index) => (
          <MyDeckListItem
            accentColor={deck.accentColor}
            cardCountLabel={t("decks.cardCount", { count: deck.cardCount })}
            index={index}
            key={deck.id}
            onEditPress={() =>
              router.push({
                pathname: "/decks/[deckId]/edit",
                params: { deckId: deck.id },
              })
            }
            onPress={() =>
              router.push({
                pathname: "/study/[deckId]",
                params: { deckId: deck.id },
              })
            }
            title={deck.title}
          />
        ))}
      </AnimatedScreen>
    </AppScreenFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: tokens.spacing.xl,
    marginBottom: tokens.spacing.l,
  },
  title: {
    ...tokens.typography.pageTitle,
  },
  subheader: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
    justifyContent: "space-between",
  },
  sectionTitle: {
    ...tokens.typography.subheading,
  },
  freeHint: {
    ...tokens.typography.captionBold,
    flexShrink: 1,
    textAlign: "right",
  },
  list: {
    gap: tokens.spacing.s,
  },
  emptyState: {
    gap: tokens.spacing.xs,
  },
  emptyTitle: {
    ...tokens.typography.subheading,
  },
  emptyBody: {
    ...tokens.typography.body,
  },
  fabContainer: {
    alignItems: "center",
    bottom: 94,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
