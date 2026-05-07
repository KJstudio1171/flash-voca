import type {
  LocalDeckActivityRecord,
  LocalDeckCardRecord,
  LocalDeckRecord,
} from "@/src/core/database/types";
import type {
  Deck,
  DeckActivity,
  DeckCard,
} from "@/src/core/domain/models";
import {
  normalizeDifficulty,
  normalizeVisibility,
  parseTags,
} from "@/src/core/repositories/sqlite/deckPersistence";

export type DeckSummaryRow = LocalDeckRecord & {
  cardCount: number;
};

export const DECK_SUMMARY_SELECT = `
  SELECT
    d.id as id,
    d.owner_id as ownerId,
    d.title as title,
    d.description as description,
    d.source_type as sourceType,
    d.accent_color as accentColor,
    d.visibility as visibility,
    d.source_language as sourceLanguage,
    d.target_language as targetLanguage,
    d.is_deleted as isDeleted,
    d.sync_state as syncState,
    d.last_synced_at as lastSyncedAt,
    d.created_at as createdAt,
    d.updated_at as updatedAt,
    COUNT(c.id) as cardCount
  FROM local_decks d
  LEFT JOIN local_deck_cards c ON c.deck_id = d.id
`;

export const DECK_CARD_SELECT = `
  SELECT
    id,
    deck_id as deckId,
    term,
    meaning,
    pronunciation,
    part_of_speech as partOfSpeech,
    difficulty,
    example,
    example_translation as exampleTranslation,
    note,
    tags,
    synonyms,
    antonyms,
    related_expressions as relatedExpressions,
    source,
    image_uri as imageUri,
    position,
    created_at as createdAt,
    updated_at as updatedAt
  FROM local_deck_cards
`;

export function mapDeck(row: DeckSummaryRow): Deck {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.sourceType,
    ownerId: row.ownerId,
    accentColor: row.accentColor,
    visibility: normalizeVisibility(row.visibility),
    sourceLanguage: row.sourceLanguage ?? "en",
    targetLanguage: row.targetLanguage ?? "ko",
    cardCount: Number(row.cardCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCard(row: LocalDeckCardRecord): DeckCard {
  return {
    id: row.id,
    deckId: row.deckId,
    term: row.term,
    meaning: row.meaning,
    pronunciation: row.pronunciation,
    partOfSpeech: row.partOfSpeech,
    difficulty: normalizeDifficulty(row.difficulty),
    example: row.example,
    exampleTranslation: row.exampleTranslation,
    note: row.note,
    tags: parseTags(row.tags),
    synonyms: row.synonyms,
    antonyms: row.antonyms,
    relatedExpressions: row.relatedExpressions,
    source: row.source,
    imageUri: row.imageUri,
    position: Number(row.position ?? 0),
  };
}

export function mapActivity(row: LocalDeckActivityRecord): DeckActivity {
  return {
    id: row.id,
    deckId: row.deckId,
    activityType: row.activityType,
    summary: row.summary,
    createdAt: row.createdAt,
  };
}
