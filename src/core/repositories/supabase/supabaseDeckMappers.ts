import type {
  RemoteCardRecord,
  RemoteDeckPayload,
  RemoteDeckRecord,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface SupabaseDeckRow {
  id: string;
  title: string;
  description: string | null;
  accent_color: string;
  visibility: "private" | "public";
  source_language: string;
  target_language: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCardRow {
  id: string;
  deck_id: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  difficulty: "easy" | "medium" | "hard";
  example: string | null;
  example_translation: string | null;
  note: string | null;
  tags: string[] | null;
  synonyms: string | null;
  antonyms: string | null;
  related_expressions: string | null;
  source: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDeckRow(row: SupabaseDeckRow): RemoteDeckRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    accentColor: row.accent_color,
    visibility: row.visibility,
    sourceLanguage: row.source_language,
    targetLanguage: row.target_language,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCardRow(row: SupabaseCardRow): RemoteCardRecord {
  return {
    id: row.id,
    deckId: row.deck_id,
    term: row.term,
    meaning: row.meaning,
    pronunciation: row.pronunciation,
    partOfSpeech: row.part_of_speech,
    difficulty: row.difficulty,
    example: row.example,
    exampleTranslation: row.example_translation,
    note: row.note,
    tags: Array.isArray(row.tags) ? row.tags : [],
    synonyms: row.synonyms,
    antonyms: row.antonyms,
    relatedExpressions: row.related_expressions,
    source: row.source,
    position: row.position,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDeckUpsertRow(userId: string, payload: RemoteDeckPayload) {
  return {
    id: payload.deck.id,
    user_id: userId,
    title: payload.deck.title,
    description: payload.deck.description,
    accent_color: payload.deck.accentColor,
    visibility: payload.deck.visibility,
    source_language: payload.deck.sourceLanguage,
    target_language: payload.deck.targetLanguage,
    deleted_at: payload.deck.deletedAt,
    created_at: payload.deck.createdAt,
    updated_at: payload.deck.updatedAt,
  };
}

export function toCardUpsertRows(userId: string, payload: RemoteDeckPayload) {
  return payload.cards.map((card) => ({
    id: card.id,
    deck_id: card.deckId,
    user_id: userId,
    term: card.term,
    meaning: card.meaning,
    pronunciation: card.pronunciation,
    part_of_speech: card.partOfSpeech,
    difficulty: card.difficulty,
    example: card.example,
    example_translation: card.exampleTranslation,
    note: card.note,
    tags: card.tags,
    synonyms: card.synonyms,
    antonyms: card.antonyms,
    related_expressions: card.relatedExpressions,
    source: card.source,
    position: card.position,
    deleted_at: card.deletedAt,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  }));
}
