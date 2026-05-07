import type {
  CardDifficulty,
  DeckCard,
  DeckVisibility,
  SaveDeckPayload,
} from "@/src/core/domain/models";
import { createId } from "@/src/shared/utils/createId";

export type PersistedCardInput = Omit<DeckCard, "deckId"> & {
  createdAt: string;
  updatedAt: string;
  tagsJson: string;
};

export interface NormalizedDeckSaveInput {
  deckId: string;
  title: string;
  description: string | null;
  accentColor: string;
  visibility: DeckVisibility;
  sourceLanguage: string;
  targetLanguage: string;
  persistedCards: PersistedCardInput[];
}

export function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeTags(value: string[] | null | undefined) {
  return JSON.stringify(
    Array.from(
      new Set((value ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
    ),
  );
}

export function parseTags(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

export function normalizeDifficulty(
  value: CardDifficulty | null | undefined,
): CardDifficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

export function normalizeVisibility(
  value: DeckVisibility | null | undefined,
): DeckVisibility {
  return value === "public" ? "public" : "private";
}

export function normalizeDeckSavePayload(
  payload: SaveDeckPayload,
  deckId: string,
  now: string,
): NormalizedDeckSaveInput {
  return {
    deckId,
    title: payload.title.trim(),
    description: normalizeOptionalText(payload.description),
    accentColor: payload.accentColor ?? "#0F766E",
    visibility: normalizeVisibility(payload.visibility),
    sourceLanguage: normalizeOptionalText(payload.sourceLanguage) ?? "en",
    targetLanguage: normalizeOptionalText(payload.targetLanguage) ?? "ko",
    persistedCards: [...payload.cards]
      .sort((left, right) => left.position - right.position)
      .map((card, index): PersistedCardInput => {
        const tagsJson = normalizeTags(card.tags);
        return {
          id: card.id ?? createId("card"),
          term: card.term.trim(),
          meaning: card.meaning.trim(),
          pronunciation: normalizeOptionalText(card.pronunciation),
          partOfSpeech: normalizeOptionalText(card.partOfSpeech),
          difficulty: normalizeDifficulty(card.difficulty),
          example: normalizeOptionalText(card.example),
          exampleTranslation: normalizeOptionalText(card.exampleTranslation),
          note: normalizeOptionalText(card.note),
          tags: parseTags(tagsJson),
          tagsJson,
          synonyms: normalizeOptionalText(card.synonyms),
          antonyms: normalizeOptionalText(card.antonyms),
          relatedExpressions: normalizeOptionalText(card.relatedExpressions),
          source: normalizeOptionalText(card.source),
          imageUri: normalizeOptionalText(card.imageUri),
          position: index,
          createdAt: now,
          updatedAt: now,
        };
      }),
  };
}
