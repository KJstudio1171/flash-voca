import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { CardDifficulty } from "@/src/core/domain/models";
import {
  useDeckDetailQuery,
  useSaveDeckMutation,
} from "@/src/features/decks/hooks/useDeckQueries";
import {
  EditableDeckCard,
  createEmptyEditableCard,
  difficultyOptions,
  joinTags,
  partOfSpeechOptions,
  splitTags,
  toEditableCards,
} from "@/src/features/decks/utils/deckEditing";
import { useT } from "@/src/shared/i18n";
import type { TranslationKey } from "@/src/shared/i18n/types";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { TextField } from "@/src/shared/ui/TextField";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function CardDetailEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const params = useLocalSearchParams<{
    deckId: string | string[];
    cardId: string | string[];
  }>();
  const deckId = getParamValue(params.deckId);
  const cardId = getParamValue(params.cardId);
  const isNewCard = cardId === "new";
  const deckQuery = useDeckDetailQuery(deckId);
  const saveDeckMutation = useSaveDeckMutation();
  const deck = deckQuery.data;
  const cardExists = isNewCard || Boolean(deck?.cards.some((item) => item.id === cardId));
  const showMissingCard = Boolean(deck) && !cardExists;
  const [card, setCard] = useState<EditableDeckCard>(() => createEmptyEditableCard(0));
  const [tagText, setTagText] = useState("");

  useEffect(() => {
    if (!deck) {
      return;
    }

    if (isNewCard) {
      const draft = createEmptyEditableCard(deck.cards.length);
      setCard(draft);
      setTagText("");
      return;
    }

    const existingCard = toEditableCards(deck.cards).find((item) => item.id === cardId);
    if (existingCard) {
      setCard(existingCard);
      setTagText(joinTags(existingCard.tags ?? []));
    }
  }, [cardId, deck, isNewCard]);

  const canSave =
    Boolean(deck) &&
    card.term.trim().length > 0 &&
    card.meaning.trim().length > 0 &&
    !saveDeckMutation.isPending;

  function updateCard(patch: Partial<EditableDeckCard>) {
    setCard((current) => ({ ...current, ...patch }));
  }

  async function saveCard() {
    if (!deck || !canSave) {
      Alert.alert(t("cardEditor.saveAlertTitle"), t("cardEditor.saveAlertBody"));
      return;
    }

    const nextCard = {
      ...card,
      tags: splitTags(tagText),
      position: isNewCard ? deck.cards.length : card.position,
    };
    const existingCards = toEditableCards(deck.cards);
    const cards = isNewCard
      ? [...existingCards, nextCard]
      : existingCards.map((item) => (item.id === cardId ? nextCard : item));

    await saveDeckMutation.mutateAsync({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      accentColor: deck.accentColor,
      visibility: deck.visibility,
      sourceLanguage: deck.sourceLanguage,
      targetLanguage: deck.targetLanguage,
      cards,
    });

    router.replace(`/decks/${deck.id}/cards` as never);
  }

  function deleteCard() {
    if (!deck || isNewCard) {
      router.back();
      return;
    }

    Alert.alert(t("cardEditor.deleteAlertTitle"), t("cardEditor.deleteAlertBody"), [
      { text: t("cardEditor.cancel"), style: "cancel" },
      {
        text: t("cardEditor.delete"),
        style: "destructive",
        onPress: () => {
          void saveDeckMutation
            .mutateAsync({
              id: deck.id,
              title: deck.title,
              description: deck.description,
              accentColor: deck.accentColor,
              visibility: deck.visibility,
              sourceLanguage: deck.sourceLanguage,
              targetLanguage: deck.targetLanguage,
              cards: toEditableCards(deck.cards.filter((item) => item.id !== cardId)),
            })
            .then(() => router.replace(`/decks/${deck.id}/cards` as never));
        },
      },
    ]);
  }

  return (
    <AppScreenFrame
      bottomInset="none"
      contentStyle={styles.content}
      headerSlot={
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <HeaderIconButton iconName="chevron-left" onPress={() => router.back()} />
          <Text style={[styles.topTitle, { color: colors.ink }]}>{t("cardEditor.title")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void saveCard()}
            style={({ pressed }) => [styles.saveTextButton, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Text style={[styles.saveText, { color: colors.primary }]}>{t("cardEditor.save")}</Text>
          </Pressable>
        </View>
      }
    >
      {deckQuery.isLoading ? (
        <CardSurface>
          <Text style={[styles.body, { color: colors.muted }]}>{t("cardEditor.loading")}</Text>
        </CardSurface>
      ) : null}

      {showMissingCard ? (
        <CardSurface elevation="soft">
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            {t("cardEditor.missingTitle")}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("cardEditor.missingBody")}
          </Text>
          <AppButton
            onPress={() => router.replace(`/decks/${deckId}/cards` as never)}
            variant="secondary"
          >
            {t("cardEditor.backToList")}
          </AppButton>
        </CardSurface>
      ) : null}

      {deck && !showMissingCard ? (
        <>
          <CardSurface elevation="soft" padding="m" style={styles.form}>
            <LabeledField label={t("cardEditor.term")}>
              <TextField
                onChangeText={(value) => updateCard({ term: value })}
                placeholder={t("cardEditor.termPlaceholder")}
                value={card.term}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.meaning")}>
              <TextField
                onChangeText={(value) => updateCard({ meaning: value })}
                placeholder={t("cardEditor.meaningPlaceholder")}
                value={card.meaning}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.pronunciation")}>
              <TextField
                onChangeText={(value) => updateCard({ pronunciation: value })}
                placeholder={t("cardEditor.pronunciationPlaceholder")}
                value={card.pronunciation ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.partOfSpeech")}>
              <View style={styles.optionRow}>
                {partOfSpeechOptions.map((option) => (
                  <OptionChip
                    active={card.partOfSpeech === option}
                    key={option}
                    label={t(partOfSpeechLabelKeyByValue[option])}
                    onPress={() => updateCard({ partOfSpeech: option })}
                  />
                ))}
              </View>
            </LabeledField>
            <LabeledField label={t("cardEditor.difficulty")}>
              <View style={styles.segmented}>
                {difficultyOptions.map((option) => (
                  <DifficultyButton
                    active={card.difficulty === option}
                    difficulty={option}
                    key={option}
                    label={t(difficultyLabelKeyById[option])}
                    onPress={() => updateCard({ difficulty: option })}
                  />
                ))}
              </View>
            </LabeledField>
            <LabeledField label={t("cardEditor.example")}>
              <TextField
                onChangeText={(value) => updateCard({ example: value })}
                placeholder={t("cardEditor.examplePlaceholder")}
                value={card.example ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.exampleTranslation")}>
              <TextField
                onChangeText={(value) => updateCard({ exampleTranslation: value })}
                placeholder={t("cardEditor.exampleTranslationPlaceholder")}
                value={card.exampleTranslation ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.memo")}>
              <TextField
                multiline
                onChangeText={(value) => updateCard({ note: value })}
                placeholder={t("cardEditor.memoPlaceholder")}
                style={styles.memoInput}
                value={card.note ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.tags")}>
              <TextField
                onChangeText={setTagText}
                placeholder={t("cardEditor.tagsPlaceholder")}
                value={tagText}
              />
            </LabeledField>
          </CardSurface>

          <CardSurface elevation="soft" padding="m" style={styles.form}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                {t("cardEditor.moreInfo")}
              </Text>
              <MaterialCommunityIcons color={colors.muted} name="chevron-up" size={22} />
            </View>
            <LabeledField label={t("cardEditor.synonyms")}>
              <TextField
                onChangeText={(value) => updateCard({ synonyms: value })}
                placeholder={t("cardEditor.synonymsPlaceholder")}
                value={card.synonyms ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.antonyms")}>
              <TextField
                onChangeText={(value) => updateCard({ antonyms: value })}
                placeholder={t("cardEditor.antonymsPlaceholder")}
                value={card.antonyms ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.relatedExpressions")}>
              <TextField
                onChangeText={(value) => updateCard({ relatedExpressions: value })}
                placeholder={t("cardEditor.relatedExpressionsPlaceholder")}
                value={card.relatedExpressions ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.source")}>
              <TextField
                onChangeText={(value) => updateCard({ source: value })}
                placeholder={t("cardEditor.sourcePlaceholder")}
                value={card.source ?? ""}
              />
            </LabeledField>
            <LabeledField label={t("cardEditor.image")}>
              <View style={styles.imageRow}>
                <TextField
                  autoCapitalize="none"
                  onChangeText={(value) => updateCard({ imageUri: value })}
                  placeholder={t("cardEditor.imageUriPlaceholder")}
                  value={card.imageUri ?? ""}
                />
                <AppButton
                  onPress={() =>
                    Alert.alert(t("cardEditor.imageAlertTitle"), t("cardEditor.imageAlertBody"))
                  }
                  style={styles.imageButton}
                  variant="secondary"
                >
                  {t("cardEditor.addImage")}
                </AppButton>
              </View>
            </LabeledField>
          </CardSurface>

          <View style={styles.footer}>
            <AppButton
              onPress={deleteCard}
              style={[styles.footerButton, { borderColor: colors.accent }]}
              variant="secondary"
            >
              {t("cardEditor.delete")}
            </AppButton>
            <AppButton
              disabled={!canSave}
              onPress={() => void saveCard()}
              style={styles.footerButton}
            >
              {saveDeckMutation.isPending ? t("cardEditor.saving") : t("cardEditor.save")}
            </AppButton>
          </View>
        </>
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
      style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={30} />
    </Pressable>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.fieldControl}>{children}</View>
    </View>
  );
}

function OptionChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionChip,
        {
          backgroundColor: active ? colors.primarySoft : colors.surface,
          borderColor: active ? colors.primary : colors.line,
        },
      ]}
    >
      <Text style={[styles.optionText, { color: active ? colors.primary : colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DifficultyButton({
  active,
  difficulty,
  label,
  onPress,
}: {
  active: boolean;
  difficulty: CardDifficulty;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.difficultyButton,
        active ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
      ]}
    >
      <Text style={[styles.difficultyText, { color: active ? colors.onPrimary : colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const difficultyLabelKeyById = {
  easy: "cardEditor.difficultyOption.easy",
  medium: "cardEditor.difficultyOption.medium",
  hard: "cardEditor.difficultyOption.hard",
} satisfies Record<CardDifficulty, TranslationKey>;

const partOfSpeechLabelKeyByValue = {
  noun: "cardEditor.partOfSpeechOption.noun",
  verb: "cardEditor.partOfSpeechOption.verb",
  adjective: "cardEditor.partOfSpeechOption.adjective",
  adverb: "cardEditor.partOfSpeechOption.adverb",
  preposition: "cardEditor.partOfSpeechOption.preposition",
  phrase: "cardEditor.partOfSpeechOption.phrase",
} satisfies Record<(typeof partOfSpeechOptions)[number], TranslationKey>;

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
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  saveTextButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 56,
  },
  saveText: {
    ...tokens.typography.bodyBold,
  },
  content: {
    gap: tokens.spacing.m,
  },
  form: {
    gap: tokens.spacing.s,
  },
  field: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  fieldLabel: {
    ...tokens.typography.body,
    paddingTop: tokens.spacing.s,
    width: 84,
  },
  fieldControl: {
    flex: 1,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
  optionChip: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.s,
    paddingVertical: tokens.spacing.xs,
  },
  optionText: {
    ...tokens.typography.captionBold,
  },
  segmented: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  difficultyButton: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
  },
  difficultyText: {
    ...tokens.typography.captionBold,
  },
  memoInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    ...tokens.typography.subheading,
  },
  imageRow: {
    gap: tokens.spacing.s,
  },
  imageButton: {
    minHeight: 40,
  },
  footer: {
    flexDirection: "row",
    gap: tokens.spacing.m,
    paddingBottom: tokens.spacing.l,
  },
  footerButton: {
    flex: 1,
  },
  body: {
    ...tokens.typography.body,
  },
});
