import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  useDeckDetailQuery,
  useSaveDeckMutation,
} from "@/src/features/decks/hooks/useDeckQueries";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { TextField } from "@/src/shared/ui/TextField";
import { tokens } from "@/src/shared/theme/tokens";
import { createId } from "@/src/shared/utils/createId";

type EditableCard = {
  id?: string;
  term: string;
  meaning: string;
  example: string;
  note: string;
};

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function createEmptyCard(): EditableCard {
  return {
    id: createId("draft_card"),
    term: "",
    meaning: "",
    example: "",
    note: "",
  };
}

export default function DeckEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const isNewDeck = deckId === "new";
  const deckQuery = useDeckDetailQuery(deckId, !isNewDeck);
  const saveDeckMutation = useSaveDeckMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<EditableCard[]>([createEmptyCard(), createEmptyCard()]);

  useEffect(() => {
    if (isNewDeck) {
      setTitle("");
      setDescription("");
      setCards([createEmptyCard(), createEmptyCard()]);
      return;
    }

    if (!deckQuery.data) {
      return;
    }

    setTitle(deckQuery.data.title);
    setDescription(deckQuery.data.description ?? "");
    setCards(
      deckQuery.data.cards.length > 0
        ? deckQuery.data.cards.map((card) => ({
            id: card.id,
            term: card.term,
            meaning: card.meaning,
            example: card.example ?? "",
            note: card.note ?? "",
          }))
        : [createEmptyCard()],
    );
  }, [deckQuery.data, isNewDeck]);

  const completeCards = cards.filter(
    (card) => card.term.trim().length > 0 && card.meaning.trim().length > 0,
  );
  const canSave =
    title.trim().length > 0 && completeCards.length > 0 && !saveDeckMutation.isPending;

  async function handleSave() {
    if (!canSave) {
      Alert.alert("Incomplete deck", "제목과 term/meaning이 있는 카드 한 장 이상이 필요합니다.");
      return;
    }

    const savedDeck = await saveDeckMutation.mutateAsync({
      id: isNewDeck ? undefined : deckId,
      title,
      description,
      cards: completeCards.map((card, index) => ({
        id: card.id,
        term: card.term,
        meaning: card.meaning,
        example: card.example,
        note: card.note,
        position: index,
      })),
    });

    router.replace({
      pathname: "/decks/[deckId]/edit",
      params: { deckId: savedDeck.id },
    });
  }

  function updateCard(index: number, patch: Partial<EditableCard>) {
    setCards((current) =>
      current.map((card, currentIndex) =>
        currentIndex === index ? { ...card, ...patch } : card,
      ),
    );
  }

  function removeCard(index: number) {
    setCards((current) =>
      current.length <= 1 ? [createEmptyCard()] : current.filter((_, i) => i !== index),
    );
  }

  return (
    <Screen
      title={isNewDeck ? "Create Deck" : "Edit Deck"}
      subtitle="편집 화면은 UI -> service -> repository 경로만 사용합니다. 화면에서 DB를 직접 호출하지 않습니다."
      rightSlot={
        !isNewDeck ? (
          <AppButton
            onPress={() =>
              router.push({
                pathname: "/study/[deckId]",
                params: { deckId },
              })
            }
            variant="secondary"
          >
            Study
          </AppButton>
        ) : undefined
      }
    >
      <Panel>
        <Badge tone="primary">{isNewDeck ? "Draft" : "Persisted"}</Badge>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Deck meta</Text>
        <TextField onChangeText={setTitle} placeholder="Deck title" value={title} />
        <TextField
          multiline
          onChangeText={setDescription}
          placeholder="Short description"
          style={styles.multilineInput}
          value={description}
        />
      </Panel>

      <Panel>
        <View style={styles.rowHeader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Cards</Text>
          <AppButton
            onPress={() => setCards((current) => [...current, createEmptyCard()])}
            variant="ghost"
          >
            Add Card
          </AppButton>
        </View>

        {cards.map((card, index) => (
          <View
            key={card.id ?? `card_${index}`}
            style={[styles.cardEditor, { borderTopColor: colors.line }]}
          >
            <Text style={[styles.cardIndex, { color: colors.muted }]}>Card {index + 1}</Text>
            <TextField
              onChangeText={(value) => updateCard(index, { term: value })}
              placeholder="Term"
              value={card.term}
            />
            <TextField
              onChangeText={(value) => updateCard(index, { meaning: value })}
              placeholder="Meaning"
              value={card.meaning}
            />
            <TextField
              onChangeText={(value) => updateCard(index, { example: value })}
              placeholder="Example sentence"
              value={card.example}
            />
            <TextField
              onChangeText={(value) => updateCard(index, { note: value })}
              placeholder="Memo"
              value={card.note}
            />
            <AppButton onPress={() => removeCard(index)} variant="ghost">
              Remove
            </AppButton>
          </View>
        ))}
      </Panel>

      <Panel>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Save state</Text>
        <Text style={[styles.helpText, { color: colors.muted }]}>
          저장 시 deck + deck_cards를 함께 갱신합니다. 결제/권한 테이블과는 분리되어 있어 무료 개인 학습 기능을 먼저 완성할 수 있습니다.
        </Text>
        <AppButton onPress={() => void handleSave()} disabled={!canSave}>
          {saveDeckMutation.isPending ? "Saving..." : "Save Deck"}
        </AppButton>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.s,
  },
  cardEditor: {
    gap: tokens.spacing.s,
    paddingTop: tokens.spacing.s,
    borderTopWidth: 1,
  },
  cardIndex: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  helpText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
