import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";

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
import { pickAndCopyLocalCardImage } from "@/src/features/decks/utils/cardImagePicker";
import {
  getClearedOptionalFieldPatch,
  getInitialOptionalFields,
  optionalFieldDefinitions,
  type OptionalFieldId,
} from "@/src/features/decks/utils/cardOptionalFields";
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
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<Set<OptionalFieldId>>(
    () => new Set(),
  );
  const optionalFields = useMemo(
    () =>
      optionalFieldDefinitions.map((definition) => ({
        ...definition,
        label: t(definition.labelKey),
      })),
    [t],
  );
  const hiddenOptionalFields = optionalFields.filter(
    (definition) => !visibleOptionalFields.has(definition.id),
  );

  useEffect(() => {
    if (!deck) {
      return;
    }

    if (isNewCard) {
      const draft = createEmptyEditableCard(deck.cards.length);
      setCard(draft);
      setTagText("");
      setVisibleOptionalFields(new Set());
      return;
    }

    const existingCard = toEditableCards(deck.cards).find((item) => item.id === cardId);
    if (existingCard) {
      setCard(existingCard);
      setTagText(joinTags(existingCard.tags ?? []));
      setVisibleOptionalFields(getInitialOptionalFields(existingCard));
    }
  }, [cardId, deck, isNewCard]);

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [card.imageUri]);

  const canSave =
    Boolean(deck) &&
    card.term.trim().length > 0 &&
    card.meaning.trim().length > 0 &&
    !saveDeckMutation.isPending;

  function updateCard(patch: Partial<EditableDeckCard>) {
    setCard((current) => ({ ...current, ...patch }));
  }

  function showOptionalField(fieldId: OptionalFieldId) {
    setVisibleOptionalFields((current) => new Set(current).add(fieldId));
  }

  function hideOptionalField(fieldId: OptionalFieldId) {
    setVisibleOptionalFields((current) => {
      const next = new Set(current);
      next.delete(fieldId);
      return next;
    });

    if (fieldId === "tags") {
      setTagText("");
    }

    updateCard(getClearedOptionalFieldPatch(fieldId));
  }

  async function pickLocalImage() {
    try {
      const result = await pickAndCopyLocalCardImage();

      if (result.status === "permissionDenied") {
        Alert.alert(t("cardEditor.imagePermissionTitle"), t("cardEditor.imagePermissionBody"));
        return;
      }

      if (result.status === "cancelled") {
        return;
      }

      updateCard({ imageUri: result.uri });
    } catch {
      Alert.alert(t("cardEditor.imagePickErrorTitle"), t("cardEditor.imagePickErrorBody"));
    }
  }

  function clearImage() {
    updateCard({ imageUri: null });
    setImagePreviewFailed(false);
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
          </CardSurface>

          <CardSurface elevation="soft" padding="m" style={styles.form}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                {t("cardEditor.optionalFields")}
              </Text>
            </View>
            {hiddenOptionalFields.length > 0 ? (
              <>
                <Text style={[styles.body, { color: colors.muted }]}>
                  {t("cardEditor.optionalFieldsHint")}
                </Text>
                <View style={styles.optionRow}>
                  {hiddenOptionalFields.map((field) => (
                    <OptionChip
                      active={false}
                      iconName="plus"
                      key={field.id}
                      label={field.label}
                      onPress={() => showOptionalField(field.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {visibleOptionalFields.has("pronunciation") ? (
              <OptionalField
                label={t("cardEditor.pronunciation")}
                onRemove={() => hideOptionalField("pronunciation")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ pronunciation: value })}
                  placeholder={t("cardEditor.pronunciationPlaceholder")}
                  value={card.pronunciation ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("partOfSpeech") ? (
              <OptionalField
                label={t("cardEditor.partOfSpeech")}
                onRemove={() => hideOptionalField("partOfSpeech")}
              >
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
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("difficulty") ? (
              <OptionalField
                label={t("cardEditor.difficulty")}
                onRemove={() => hideOptionalField("difficulty")}
              >
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
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("example") ? (
              <OptionalField
                label={t("cardEditor.example")}
                onRemove={() => hideOptionalField("example")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ example: value })}
                  placeholder={t("cardEditor.examplePlaceholder")}
                  value={card.example ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("exampleTranslation") ? (
              <OptionalField
                label={t("cardEditor.exampleTranslation")}
                onRemove={() => hideOptionalField("exampleTranslation")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ exampleTranslation: value })}
                  placeholder={t("cardEditor.exampleTranslationPlaceholder")}
                  value={card.exampleTranslation ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("note") ? (
              <OptionalField
                label={t("cardEditor.memo")}
                onRemove={() => hideOptionalField("note")}
              >
                <TextField
                  multiline
                  onChangeText={(value) => updateCard({ note: value })}
                  placeholder={t("cardEditor.memoPlaceholder")}
                  style={styles.memoInput}
                  value={card.note ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("tags") ? (
              <OptionalField
                label={t("cardEditor.tags")}
                onRemove={() => hideOptionalField("tags")}
              >
                <TextField
                  onChangeText={setTagText}
                  placeholder={t("cardEditor.tagsPlaceholder")}
                  value={tagText}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("synonyms") ? (
              <OptionalField
                label={t("cardEditor.synonyms")}
                onRemove={() => hideOptionalField("synonyms")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ synonyms: value })}
                  placeholder={t("cardEditor.synonymsPlaceholder")}
                  value={card.synonyms ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("antonyms") ? (
              <OptionalField
                label={t("cardEditor.antonyms")}
                onRemove={() => hideOptionalField("antonyms")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ antonyms: value })}
                  placeholder={t("cardEditor.antonymsPlaceholder")}
                  value={card.antonyms ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("relatedExpressions") ? (
              <OptionalField
                label={t("cardEditor.relatedExpressions")}
                onRemove={() => hideOptionalField("relatedExpressions")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ relatedExpressions: value })}
                  placeholder={t("cardEditor.relatedExpressionsPlaceholder")}
                  value={card.relatedExpressions ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("source") ? (
              <OptionalField
                label={t("cardEditor.source")}
                onRemove={() => hideOptionalField("source")}
              >
                <TextField
                  onChangeText={(value) => updateCard({ source: value })}
                  placeholder={t("cardEditor.sourcePlaceholder")}
                  value={card.source ?? ""}
                />
              </OptionalField>
            ) : null}

            {visibleOptionalFields.has("imageUri") ? (
              <OptionalField
                label={t("cardEditor.image")}
                onRemove={() => hideOptionalField("imageUri")}
              >
                <View style={styles.imageRow}>
                  {card.imageUri && !imagePreviewFailed ? (
                    <Image
                      onError={() => setImagePreviewFailed(true)}
                      resizeMode="cover"
                      source={{ uri: card.imageUri }}
                      style={styles.imagePreview}
                    />
                  ) : card.imageUri ? (
                    <View
                      style={[
                        styles.imageFallback,
                        { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
                      ]}
                    >
                      <MaterialCommunityIcons color={colors.muted} name="image-broken" size={28} />
                      <Text style={[styles.body, { color: colors.muted }]}>
                        {t("cardEditor.imagePreviewUnavailable")}
                      </Text>
                    </View>
                  ) : null}
                  <AppButton
                    onPress={() => void pickLocalImage()}
                    style={styles.imageButton}
                    variant="secondary"
                  >
                    {card.imageUri ? t("cardEditor.changeImage") : t("cardEditor.chooseImage")}
                  </AppButton>
                  {card.imageUri ? (
                    <AppButton onPress={clearImage} style={styles.imageButton} variant="secondary">
                      {t("cardEditor.removeImage")}
                    </AppButton>
                  ) : null}
                </View>
              </OptionalField>
            ) : null}
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

function OptionalField({
  label,
  children,
  onRemove,
}: {
  label: string;
  children: ReactNode;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.optionalField}>
      <View style={styles.optionalHeader}>
        <Text style={[styles.optionalLabel, { color: colors.ink }]}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={onRemove}
          style={({ pressed }) => [styles.removeFieldButton, { opacity: pressed ? 0.55 : 1 }]}
        >
          <MaterialCommunityIcons color={colors.muted} name="close" size={20} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function OptionChip({
  active,
  iconName,
  label,
  onPress,
}: {
  active: boolean;
  iconName?: ComponentProps<typeof MaterialCommunityIcons>["name"];
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
      {iconName ? (
        <MaterialCommunityIcons
          color={active ? colors.primary : colors.muted}
          name={iconName}
          size={16}
        />
      ) : null}
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
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
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
  optionalField: {
    gap: tokens.spacing.xs,
  },
  optionalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  optionalLabel: {
    ...tokens.typography.captionBold,
  },
  removeFieldButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  imageRow: {
    gap: tokens.spacing.s,
  },
  imagePreview: {
    aspectRatio: 1.6,
    borderRadius: tokens.radius.s,
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    aspectRatio: 1.6,
    borderRadius: tokens.radius.s,
    borderWidth: 1,
    gap: tokens.spacing.xs,
    justifyContent: "center",
    width: "100%",
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
