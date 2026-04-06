import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { DeckCard } from "@/src/features/home/components/DeckCard";
import { useDeckSummaryListQuery } from "@/src/features/home/hooks/useHomeSummaryQuery";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";

function buildSubtitle(totalDue: number, hasDecks: boolean): string | undefined {
  if (!hasDecks) return undefined;
  if (totalDue === 0) return "모든 카드를 복습했어요";
  return `오늘 복습할 카드 ${totalDue}장`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const summaryQuery = useDeckSummaryListQuery();
  const decks = summaryQuery.data ?? [];
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return (
    <Screen title="Home" subtitle={buildSubtitle(totalDue, decks.length > 0)}>
      {decks.length === 0 && !summaryQuery.isLoading ? (
        <Panel>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            첫 단어장을 만들어보세요
          </Text>
          <AppButton
            onPress={() =>
              router.push({
                pathname: "/decks/[deckId]/edit",
                params: { deckId: "new" },
              })
            }
          >
            Create Deck
          </AppButton>
        </Panel>
      ) : null}

      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          title={deck.title}
          cardCount={deck.cardCount}
          dueCount={deck.dueCount}
          masteredCount={deck.masteredCount}
          onPress={() =>
            router.push({
              pathname: "/study/[deckId]",
              params: { deckId: deck.id },
            })
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
