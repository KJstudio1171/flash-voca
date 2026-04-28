import type { SupabaseClient } from "@supabase/supabase-js";

import { SyncError } from "@/src/core/errors";
import type {
  RemoteCardRecord,
  RemoteDeckGateway,
  RemoteDeckPayload,
  RemoteDeckRecord,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";

interface DeckRow {
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

interface CardRow {
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

function mapDeck(row: DeckRow): RemoteDeckRecord {
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

function mapCard(row: CardRow): RemoteCardRecord {
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

export class SupabaseDeckGateway implements RemoteDeckGateway {
  constructor(private readonly client: SupabaseClient) {}

  async upsertDeckAsync(userId: string, payload: RemoteDeckPayload): Promise<void> {
    const { error: deckError } = await this.client.from("user_decks").upsert({
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
    });
    if (deckError) throw new SyncError({ cause: deckError });

    if (payload.cards.length === 0) return;

    const { error: cardsError } = await this.client.from("user_deck_cards").upsert(
      payload.cards.map((c) => ({
        id: c.id,
        deck_id: c.deckId,
        user_id: userId,
        term: c.term,
        meaning: c.meaning,
        pronunciation: c.pronunciation,
        part_of_speech: c.partOfSpeech,
        difficulty: c.difficulty,
        example: c.example,
        example_translation: c.exampleTranslation,
        note: c.note,
        tags: c.tags,
        synonyms: c.synonyms,
        antonyms: c.antonyms,
        related_expressions: c.relatedExpressions,
        source: c.source,
        position: c.position,
        deleted_at: c.deletedAt,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      })),
    );
    if (cardsError) throw new SyncError({ cause: cardsError });
  }

  async softDeleteDeckAsync(
    userId: string,
    deckId: string,
    deletedAt: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("user_decks")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", deckId)
      .eq("user_id", userId);
    if (error) throw new SyncError({ cause: error });
  }

  async pullDecksUpdatedAfterAsync(
    userId: string,
    since: string | null,
    limit: number,
  ): Promise<RemoteDeckPayload[]> {
    let decksQuery = this.client
      .from("user_decks")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (since) decksQuery = decksQuery.gt("updated_at", since);

    const { data: decks, error } = await decksQuery;
    if (error) throw new SyncError({ cause: error });
    if (!decks || decks.length === 0) return [];

    const deckIds = (decks as DeckRow[]).map((d) => d.id);
    const { data: cards, error: cardsError } = await this.client
      .from("user_deck_cards")
      .select("*")
      .eq("user_id", userId)
      .in("deck_id", deckIds);
    if (cardsError) throw new SyncError({ cause: cardsError });

    const cardsByDeck = new Map<string, RemoteCardRecord[]>();
    for (const c of (cards ?? []) as CardRow[]) {
      const list = cardsByDeck.get(c.deck_id) ?? [];
      list.push(mapCard(c));
      cardsByDeck.set(c.deck_id, list);
    }

    return (decks as DeckRow[]).map((d) => ({
      deck: mapDeck(d),
      cards: cardsByDeck.get(d.id) ?? [],
    }));
  }
}
