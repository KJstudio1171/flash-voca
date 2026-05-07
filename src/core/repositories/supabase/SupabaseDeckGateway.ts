import type { SupabaseClient } from "@supabase/supabase-js";

import { SyncError } from "@/src/core/errors";
import type {
  RemoteDeckGateway,
  RemoteDeckPayload,
  RemoteDeckPullCursor,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";
import {
  mapCardRow,
  mapDeckRow,
  toCardUpsertRows,
  toDeckUpsertRow,
  type SupabaseCardRow,
  type SupabaseDeckRow,
} from "@/src/core/repositories/supabase/supabaseDeckMappers";

export class SupabaseDeckGateway implements RemoteDeckGateway {
  constructor(private readonly client: SupabaseClient) {}

  async upsertDeckAsync(userId: string, payload: RemoteDeckPayload): Promise<void> {
    const { error: deckError } = await this.client
      .from("user_decks")
      .upsert(toDeckUpsertRow(userId, payload));
    if (deckError) throw new SyncError({ cause: deckError });

    if (payload.cards.length > 0) {
      const { error: cardsError } = await this.client
        .from("user_deck_cards")
        .upsert(toCardUpsertRows(userId, payload));
      if (cardsError) throw new SyncError({ cause: cardsError });
    }

    // Remove remote cards that no longer exist in the payload so deletions
    // propagate. Without this, deleted cards re-appear on the next pull.
    const keepIds = payload.cards.map((c) => c.id);
    let deleteQuery = this.client
      .from("user_deck_cards")
      .delete()
      .eq("user_id", userId)
      .eq("deck_id", payload.deck.id);
    if (keepIds.length > 0) {
      deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new SyncError({ cause: deleteError });
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
    since: RemoteDeckPullCursor | null,
    limit: number,
  ): Promise<RemoteDeckPayload[]> {
    let decksQuery = this.client
      .from("user_decks")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);
    if (since) {
      decksQuery = decksQuery.or(
        `updated_at.gt.${since.updatedAt},and(updated_at.eq.${since.updatedAt},id.gt.${since.id})`,
      );
    }

    const { data: decks, error } = await decksQuery;
    if (error) throw new SyncError({ cause: error });
    if (!decks || decks.length === 0) return [];

    const deckRows = decks as SupabaseDeckRow[];
    const deckIds = deckRows.map((d) => d.id);
    const { data: cards, error: cardsError } = await this.client
      .from("user_deck_cards")
      .select("*")
      .eq("user_id", userId)
      .in("deck_id", deckIds);
    if (cardsError) throw new SyncError({ cause: cardsError });

    const cardsByDeck = new Map<string, ReturnType<typeof mapCardRow>[]>();
    for (const c of (cards ?? []) as SupabaseCardRow[]) {
      const list = cardsByDeck.get(c.deck_id) ?? [];
      list.push(mapCardRow(c));
      cardsByDeck.set(c.deck_id, list);
    }

    return deckRows.map((d) => ({
      deck: mapDeckRow(d),
      cards: cardsByDeck.get(d.id) ?? [],
    }));
  }
}
