import { LOCAL_USER_ID } from "@/src/core/config/constants";
import { getDatabaseAsync } from "@/src/core/database/client";
import {
  LocalDeckCardRecord,
  LocalDeckRecord,
} from "@/src/core/database/types";
import {
  Deck,
  DeckCard,
  DeckDetail,
  SaveDeckPayload,
} from "@/src/core/domain/models";
import { enqueuePendingSyncOperationAsync } from "@/src/core/repositories/sqlite/shared/enqueuePendingSyncOperation";
import { createId } from "@/src/shared/utils/createId";

type DeckSummaryRow = LocalDeckRecord & {
  cardCount: number;
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapDeck(row: DeckSummaryRow): Deck {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.sourceType,
    ownerId: row.ownerId,
    accentColor: row.accentColor,
    cardCount: Number(row.cardCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCard(row: LocalDeckCardRecord): DeckCard {
  return {
    id: row.id,
    deckId: row.deckId,
    term: row.term,
    meaning: row.meaning,
    example: row.example,
    note: row.note,
    position: Number(row.position ?? 0),
  };
}

export class SqliteDeckRepository {
  async listDecksAsync() {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<DeckSummaryRow>(
      `
        SELECT
          d.id as id,
          d.owner_id as ownerId,
          d.title as title,
          d.description as description,
          d.source_type as sourceType,
          d.accent_color as accentColor,
          d.is_deleted as isDeleted,
          d.sync_state as syncState,
          d.last_synced_at as lastSyncedAt,
          d.created_at as createdAt,
          d.updated_at as updatedAt,
          COUNT(c.id) as cardCount
        FROM local_decks d
        LEFT JOIN local_deck_cards c ON c.deck_id = d.id
        WHERE d.is_deleted = 0 AND d.source_type = 'user'
        GROUP BY d.id
        ORDER BY d.updated_at DESC;
      `,
    );

    return rows.map(mapDeck);
  }

  async getDeckByIdAsync(deckId: string) {
    const db = await getDatabaseAsync();
    const deckRow = await db.getFirstAsync<DeckSummaryRow>(
      `
        SELECT
          d.id as id,
          d.owner_id as ownerId,
          d.title as title,
          d.description as description,
          d.source_type as sourceType,
          d.accent_color as accentColor,
          d.is_deleted as isDeleted,
          d.sync_state as syncState,
          d.last_synced_at as lastSyncedAt,
          d.created_at as createdAt,
          d.updated_at as updatedAt,
          COUNT(c.id) as cardCount
        FROM local_decks d
        LEFT JOIN local_deck_cards c ON c.deck_id = d.id
        WHERE d.id = ? AND d.is_deleted = 0
        GROUP BY d.id
        LIMIT 1;
      `,
      [deckId],
    );

    if (!deckRow) {
      return null;
    }

    const cardRows = await db.getAllAsync<LocalDeckCardRecord>(
      `
        SELECT
          id,
          deck_id as deckId,
          term,
          meaning,
          example,
          note,
          position,
          created_at as createdAt,
          updated_at as updatedAt
        FROM local_deck_cards
        WHERE deck_id = ?
        ORDER BY position ASC;
      `,
      [deckId],
    );

    return {
      ...mapDeck(deckRow),
      cards: cardRows.map(mapCard),
    } satisfies DeckDetail;
  }

  async saveDeckAsync(payload: SaveDeckPayload) {
    const db = await getDatabaseAsync();
    const deckId = payload.id ?? createId("deck");
    const now = new Date().toISOString();
    const normalizedTitle = payload.title.trim();
    const normalizedDescription = normalizeOptionalText(payload.description);
    const accentColor = payload.accentColor ?? "#0F766E";
    const persistedCards = [...payload.cards]
      .sort((left, right) => left.position - right.position)
      .map((card) => ({
        id: card.id ?? createId("card"),
        term: card.term.trim(),
        meaning: card.meaning.trim(),
        example: normalizeOptionalText(card.example),
        note: normalizeOptionalText(card.note),
        position: card.position,
        createdAt: now,
        updatedAt: now,
      }));

    await db.withExclusiveTransactionAsync(async (tx) => {
      const existingDeck = await tx.getFirstAsync<{ createdAt: string }>(
        `
          SELECT created_at as createdAt
          FROM local_decks
          WHERE id = ?
          LIMIT 1;
        `,
        [deckId],
      );

      const createdAt = existingDeck?.createdAt ?? now;

      await tx.runAsync(
        `
          INSERT INTO local_decks (
            id, owner_id, title, description, source_type, accent_color, is_deleted, sync_state, last_synced_at, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, 'user', ?, 0, 'pending', NULL, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            owner_id = excluded.owner_id,
            title = excluded.title,
            description = excluded.description,
            accent_color = excluded.accent_color,
            is_deleted = 0,
            sync_state = excluded.sync_state,
            last_synced_at = NULL,
            updated_at = excluded.updated_at;
        `,
        [
          deckId,
          LOCAL_USER_ID,
          normalizedTitle,
          normalizedDescription,
          accentColor,
          createdAt,
          now,
        ],
      );

      await tx.runAsync("DELETE FROM local_deck_cards WHERE deck_id = ?;", [deckId]);

      for (const card of persistedCards) {
        await tx.runAsync(
          `
            INSERT INTO local_deck_cards (
              id, deck_id, term, meaning, example, note, position, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            card.id,
            deckId,
            card.term,
            card.meaning,
            card.example,
            card.note,
            card.position,
            card.createdAt,
            card.updatedAt,
          ],
        );
      }

      await enqueuePendingSyncOperationAsync(tx, {
        entityType: "deck",
        entityId: deckId,
        operationType: "upsert",
        payload: {
          id: deckId,
          ownerId: LOCAL_USER_ID,
          title: normalizedTitle,
          description: normalizedDescription,
          sourceType: "user",
          accentColor,
          createdAt,
          updatedAt: now,
          cards: persistedCards.map((card) => ({
            id: card.id,
            deckId,
            term: card.term,
            meaning: card.meaning,
            example: card.example,
            note: card.note,
            position: card.position,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
          })),
        },
      });
    });

    const savedDeck = await this.getDeckByIdAsync(deckId);

    if (!savedDeck) {
      throw new Error("Deck save failed");
    }

    return savedDeck;
  }

  async deleteDeckAsync(deckId: string) {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `
          UPDATE local_decks
          SET is_deleted = 1,
              sync_state = 'pending',
              last_synced_at = NULL,
              updated_at = ?
          WHERE id = ?;
        `,
        [now, deckId],
      );

      await enqueuePendingSyncOperationAsync(tx, {
        entityType: "deck",
        entityId: deckId,
        operationType: "delete",
        payload: {
          id: deckId,
          deletedAt: now,
        },
      });
    });
  }
}
