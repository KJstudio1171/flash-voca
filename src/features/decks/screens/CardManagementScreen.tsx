import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { DeckCard } from "@/src/core/domain/models";
import {
  useDeckDetailQuery,
  useSaveDeckMutation,
} from "@/src/features/decks/hooks/useDeckQueries";
import { toEditableCards } from "@/src/features/decks/utils/deckEditing";
import { useT } from "@/src/shared/i18n";
import type { TranslationKey } from "@/src/shared/i18n/types";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { FloatingActionButton } from "@/src/shared/ui/FloatingActionButton";
import { TextField } from "@/src/shared/ui/TextField";

type FilterId = "all" | "missingExample" | "duplicate" | "hard";
type ListMode = "edit" | "sort";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function CardManagementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const deckQuery = useDeckDetailQuery(deckId);
  const saveDeckMutation = useSaveDeckMutation();
  const deck = deckQuery.data;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [mode, setMode] = useState<ListMode>("edit");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const duplicateTermSet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of deck?.cards ?? []) {
      const key = card.term.trim().toLowerCase();
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([term]) => term));
  }, [deck?.cards]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const cards = deck?.cards ?? [];
    return cards
      .filter((card) => {
        if (filter === "missingExample" && card.example) return false;
        if (filter === "duplicate" && !duplicateTermSet.has(card.term.trim().toLowerCase())) {
          return false;
        }
        if (filter === "hard" && card.difficulty !== "hard") return false;
        if (!normalizedQuery) return true;
        return [card.term, card.meaning, card.example, card.exampleTranslation, card.note]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) =>
        mode === "sort" ? left.term.localeCompare(right.term) : left.position - right.position,
      );
  }, [deck?.cards, duplicateTermSet, filter, mode, query]);

  async function deleteSelectedCards() {
    if (!deck || selectedIds.size === 0) {
      return;
    }

    const selectedCount = selectedIds.size;
    Alert.alert(t("cardManagement.deleteAlertTitle"), t("cardManagement.deleteAlertBody", { count: selectedCount }), [
      { text: t("cardManagement.cancel"), style: "cancel" },
      {
        text: t("cardManagement.delete"),
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
              cards: toEditableCards(deck.cards.filter((card) => !selectedIds.has(card.id))),
            })
            .then(() => setSelectedIds(new Set()));
        },
      },
    ]);
  }

  function toggleCard(cardId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  return (
    <AppScreenFrame
      bottomInset="fab"
      contentStyle={styles.content}
      floatingSlot={
        <View pointerEvents="box-none" style={styles.fabContainer}>
          <FloatingActionButton
            accessibilityLabel={t("cardManagement.addCard")}
            onPress={() => router.push(`/decks/${deckId}/cards/new/edit` as never)}
          />
        </View>
      }
      headerSlot={
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <HeaderIconButton iconName="chevron-left" onPress={() => router.back()} />
          <Text style={[styles.topTitle, { color: colors.ink }]}>
            {t("cardManagement.title")}
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
      <TextField
        onChangeText={setQuery}
        placeholder={t("cardManagement.searchPlaceholder")}
        value={query}
      />

      <View style={styles.chipRow}>
        <FilterChip
          active={filter === "all"}
          label={t("cardManagement.allFilter", { count: deck?.cardCount ?? 0 })}
          onPress={() => setFilter("all")}
        />
        <FilterChip
          active={filter === "missingExample"}
          label={t("cardManagement.missingExampleFilter", {
            count: deck?.cards.filter((card) => !card.example).length ?? 0,
          })}
          onPress={() => setFilter("missingExample")}
        />
        <FilterChip
          active={filter === "duplicate"}
          label={t("cardManagement.duplicateFilter", { count: duplicateTermSet.size })}
          onPress={() => setFilter("duplicate")}
        />
        <FilterChip
          active={filter === "hard"}
          label={t("cardManagement.hardFilter", {
            count: deck?.cards.filter((card) => card.difficulty === "hard").length ?? 0,
          })}
          onPress={() => setFilter("hard")}
        />
      </View>

      <CardSurface elevation="soft" padding="m" style={styles.bulkActions}>
        <BulkButton
          iconName="plus"
          label={t("cardManagement.addCard")}
          onPress={() =>
            router.push(`/decks/${deckId}/cards/new/edit` as never)
          }
        />
        <BulkButton
          iconName="view-grid-plus-outline"
          label={t("cardManagement.addMultiple")}
          onPress={() =>
            router.push(`/decks/${deckId}/cards/new/edit` as never)
          }
        />
        <BulkButton
          iconName="tray-arrow-up"
          label={t("cardManagement.import")}
          onPress={() =>
            Alert.alert(t("cardManagement.importAlertTitle"), t("cardManagement.importAlertBody"))
          }
        />
      </CardSurface>

      <View style={[styles.segmented, { backgroundColor: colors.surfaceStrong }]}>
        <SegmentButton active={mode === "edit"} label={t("cardManagement.editMode")} onPress={() => setMode("edit")} />
        <SegmentButton active={mode === "sort"} label={t("cardManagement.sortMode")} onPress={() => setMode("sort")} />
      </View>

      <CardSurface elevation="soft" padding="none" style={styles.list}>
        {filteredCards.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {t("cardManagement.empty")}
          </Text>
        ) : (
          filteredCards.map((card, index) => (
            <CardRow
              card={card}
              index={index}
              key={card.id}
              onOpen={() =>
                router.push(`/decks/${deckId}/cards/${card.id}/edit` as never)
              }
              onToggle={() => toggleCard(card.id)}
              selected={selectedIds.has(card.id)}
              difficultyLabel={t(`cardManagement.difficulty.${card.difficulty}`)}
              partOfSpeechLabel={
                getPartOfSpeechLabel(card.partOfSpeech, (key) => t(key))
              }
            />
          ))
        )}
      </CardSurface>

      <View
        style={[
          styles.selectionBar,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.selectionText, { color: colors.ink }]}>
          {t("cardManagement.selectedCount", { count: selectedIds.size })}
        </Text>
        <AppButton
          disabled={selectedIds.size === 0 || saveDeckMutation.isPending}
          onPress={() => void deleteSelectedCards()}
          style={styles.deleteButton}
          variant="secondary"
        >
          {t("cardManagement.deleteSelected")}
        </AppButton>
      </View>
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

function FilterChip({
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
        styles.filterChip,
        {
          backgroundColor: active ? colors.primarySoft : colors.surface,
          borderColor: active ? colors.primary : colors.line,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BulkButton({
  iconName,
  label,
  onPress,
}: {
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.bulkButton}>
      <MaterialCommunityIcons color={colors.primary} name={iconName} size={24} />
      <Text style={[styles.bulkLabel, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function SegmentButton({
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
        styles.segmentButton,
        active ? { backgroundColor: colors.surface, borderColor: colors.primary } : null,
      ]}
    >
      <Text style={[styles.segmentText, { color: active ? colors.primary : colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CardRow({
  card,
  index,
  onOpen,
  onToggle,
  selected,
  difficultyLabel,
  partOfSpeechLabel,
}: {
  card: DeckCard;
  index: number;
  onOpen: () => void;
  onToggle: () => void;
  selected: boolean;
  difficultyLabel: string;
  partOfSpeechLabel: string | null;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onOpen}
      style={[styles.cardRow, { borderBottomColor: colors.line }]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        hitSlop={10}
        onPress={onToggle}
        style={[
          styles.checkbox,
          {
            backgroundColor: selected ? colors.primary : "transparent",
            borderColor: selected ? colors.primary : colors.muted,
          },
        ]}
      >
        {selected ? <MaterialCommunityIcons color={colors.onPrimary} name="check" size={16} /> : null}
      </Pressable>
      <Text style={[styles.rowIndex, { color: colors.muted }]}>{index + 1}</Text>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={[styles.term, { color: colors.ink }]}>
          {card.term}
        </Text>
        <Text numberOfLines={1} style={[styles.meaning, { color: colors.muted }]}>
          {card.meaning}
        </Text>
        {card.example ? (
          <Text numberOfLines={1} style={[styles.example, { color: colors.muted }]}>
            {card.example}
          </Text>
        ) : null}
      </View>
      <View style={styles.badgeColumn}>
        {partOfSpeechLabel ? <SmallBadge label={partOfSpeechLabel} tone="info" /> : null}
        <SmallBadge label={difficultyLabel} tone="neutral" />
      </View>
      <MaterialCommunityIcons color={colors.muted} name="dots-vertical" size={24} />
    </Pressable>
  );
}

function SmallBadge({ label, tone }: { label: string; tone: "info" | "neutral" }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.smallBadge,
        { backgroundColor: tone === "info" ? colors.primarySoft : colors.line },
      ]}
    >
      <Text style={[styles.smallBadgeText, { color: tone === "info" ? colors.primary : colors.muted }]}>
        {label}
      </Text>
    </View>
  );
}

function getPartOfSpeechLabel(
  value: string | null,
  translate: (key: TranslationKey) => string,
) {
  if (!value) {
    return null;
  }

  const labelKey = partOfSpeechLabelKeyByValue[value];
  return labelKey ? translate(labelKey) : value;
}

const partOfSpeechLabelKeyByValue: Record<string, TranslationKey | undefined> = {
  noun: "cardEditor.partOfSpeechOption.noun",
  verb: "cardEditor.partOfSpeechOption.verb",
  adjective: "cardEditor.partOfSpeechOption.adjective",
  adverb: "cardEditor.partOfSpeechOption.adverb",
  preposition: "cardEditor.partOfSpeechOption.preposition",
  phrase: "cardEditor.partOfSpeechOption.phrase",
};

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
  content: {
    gap: tokens.spacing.m,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.s,
  },
  filterChip: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.xs,
  },
  filterChipText: {
    ...tokens.typography.captionBold,
  },
  bulkActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bulkButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: tokens.spacing.xs,
    justifyContent: "center",
    minHeight: 44,
  },
  bulkLabel: {
    ...tokens.typography.bodyBold,
  },
  segmented: {
    borderRadius: tokens.radius.m,
    flexDirection: "row",
    padding: 3,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: tokens.radius.m - 3,
    borderWidth: 1,
    borderColor: "transparent",
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  segmentText: {
    ...tokens.typography.bodyBold,
  },
  list: {
    overflow: "hidden",
  },
  emptyText: {
    ...tokens.typography.body,
    padding: tokens.spacing.l,
    textAlign: "center",
  },
  cardRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.s,
    minHeight: 76,
    padding: tokens.spacing.s,
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  rowIndex: {
    ...tokens.typography.body,
    width: 22,
  },
  cardCopy: {
    flex: 1,
  },
  term: {
    ...tokens.typography.subheading,
  },
  meaning: {
    ...tokens.typography.caption,
  },
  example: {
    ...tokens.typography.caption,
  },
  badgeColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  smallBadge: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.s,
    paddingVertical: 3,
  },
  smallBadgeText: {
    ...tokens.typography.micro,
  },
  selectionBar: {
    alignItems: "center",
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: tokens.spacing.s,
  },
  selectionText: {
    ...tokens.typography.bodyBold,
  },
  deleteButton: {
    minHeight: 42,
  },
  fabContainer: {
    alignItems: "flex-end",
    bottom: 32,
    left: 0,
    paddingHorizontal: tokens.layout.screenPadding,
    position: "absolute",
    right: 0,
  },
});
