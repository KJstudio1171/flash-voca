import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useDeckListQuery } from "@/src/features/decks/hooks/useDeckQueries";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

export default function MyDecksScreen() {
  const router = useRouter();
  const deckQuery = useDeckListQuery();
  const decks = deckQuery.data ?? [];

  return (
    <Screen
      title="My Decks"
      subtitle="단어장 목록은 repository/service를 거쳐 로컬 SQLite에서 읽습니다."
      rightSlot={
        <AppButton
          onPress={() =>
            router.push({
              pathname: "/decks/[deckId]/edit",
              params: { deckId: "new" },
            })
          }
          variant="secondary"
        >
          New Deck
        </AppButton>
      }
    >
      {decks.map((deck) => (
        <Panel key={deck.id} accentColor={deck.accentColor}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.deckTitle}>{deck.title}</Text>
              <Text style={styles.deckDescription}>
                {deck.description || "설명이 아직 없는 단어장입니다."}
              </Text>
            </View>
            <Badge tone={deck.sourceType === "official" ? "accent" : "primary"}>
              {deck.sourceType === "official" ? "Official" : "Personal"}
            </Badge>
          </View>
          <Text style={styles.meta}>{deck.cardCount} cards ready</Text>
          <View style={styles.actions}>
            <AppButton
              onPress={() =>
                router.push({
                  pathname: "/study/[deckId]",
                  params: { deckId: deck.id },
                })
              }
            >
              Study
            </AppButton>
            <AppButton
              onPress={() =>
                router.push({
                  pathname: "/decks/[deckId]/edit",
                  params: { deckId: deck.id },
                })
              }
              variant="secondary"
            >
              Edit
            </AppButton>
          </View>
        </Panel>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing.s,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  deckDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: tokens.colors.muted,
  },
  meta: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: tokens.colors.muted,
  },
  actions: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
});
