import { DeckCard, SaveDeckPayload } from "@/src/core/domain/models";
import { createId } from "@/src/shared/utils/createId";

export type EditableDeckCard = SaveDeckPayload["cards"][number];

export const difficultyOptions = ["easy", "medium", "hard"] as const;

export const partOfSpeechOptions = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "phrase",
] as const;

export function toEditableCards(cards: DeckCard[]): EditableDeckCard[] {
  return cards.map((card, index) => ({
    id: card.id,
    term: card.term,
    meaning: card.meaning,
    pronunciation: card.pronunciation,
    partOfSpeech: card.partOfSpeech,
    difficulty: card.difficulty,
    example: card.example,
    exampleTranslation: card.exampleTranslation,
    note: card.note,
    tags: card.tags,
    synonyms: card.synonyms,
    antonyms: card.antonyms,
    relatedExpressions: card.relatedExpressions,
    source: card.source,
    imageUri: card.imageUri,
    position: index,
  }));
}

export function createEmptyEditableCard(position: number): EditableDeckCard {
  return {
    id: createId("draft_card"),
    term: "",
    meaning: "",
    pronunciation: null,
    partOfSpeech: null,
    difficulty: "medium",
    example: null,
    exampleTranslation: null,
    note: null,
    tags: [],
    synonyms: null,
    antonyms: null,
    relatedExpressions: null,
    source: null,
    imageUri: null,
    position,
  };
}

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[]): string {
  return tags.join(", ");
}
