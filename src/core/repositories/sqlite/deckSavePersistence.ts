import type {
  SQLiteBindParams,
  SQLiteRunResult,
} from "expo-sqlite";

import type { LocalDeckCardRecord } from "@/src/core/database/types";
import type { NormalizedDeckSaveInput } from "@/src/core/repositories/sqlite/deckPersistence";
import {
  buildDeckActivities,
  buildRemoteDeckPayload,
} from "@/src/core/repositories/sqlite/deckPersistence";
import {
  DECK_CARD_SELECT,
  mapCard,
} from "@/src/core/repositories/sqlite/deckRows";
import { enqueuePendingSyncOperationAsync } from "@/src/core/repositories/sqlite/shared/enqueuePendingSyncOperation";
import { createId } from "@/src/shared/utils/createId";

export interface DeckSaveTx {
  runAsync(sql: string, params: SQLiteBindParams): Promise<SQLiteRunResult>;
  getFirstAsync<T>(sql: string, params: SQLiteBindParams): Promise<T | null>;
  getAllAsync<T>(sql: string, params: SQLiteBindParams): Promise<T[]>;
}

export interface DeckSaveContext {
  existingDeck: boolean;
  createdAt: string;
  existingCardRows: LocalDeckCardRecord[];
}

export async function loadDeckSaveContextAsync(
  tx: DeckSaveTx,
  deckId: string,
  now: string,
): Promise<DeckSaveContext> {
  const existingDeck = await tx.getFirstAsync<{ createdAt: string }>(
    `
      SELECT created_at as createdAt
      FROM local_decks
      WHERE id = ?
      LIMIT 1;
    `,
    [deckId],
  );
  const existingCardRows = await tx.getAllAsync<LocalDeckCardRecord>(
    `
      ${DECK_CARD_SELECT}
      WHERE deck_id = ?;
    `,
    [deckId],
  );

  return {
    existingDeck: Boolean(existingDeck),
    createdAt: existingDeck?.createdAt ?? now,
    existingCardRows,
  };
}

export async function upsertLocalDeckAsync(input: {
  tx: DeckSaveTx;
  ownerId: string;
  normalized: NormalizedDeckSaveInput;
  createdAt: string;
  updatedAt: string;
}): Promise<void> {
  await input.tx.runAsync(
    `
      INSERT INTO local_decks (
        id, owner_id, title, description, source_type, accent_color, visibility, source_language, target_language, is_deleted, sync_state, last_synced_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, 0, 'pending', NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_id = excluded.owner_id,
        title = excluded.title,
        description = excluded.description,
        accent_color = excluded.accent_color,
        visibility = excluded.visibility,
        source_language = excluded.source_language,
        target_language = excluded.target_language,
        is_deleted = 0,
        sync_state = excluded.sync_state,
        last_synced_at = NULL,
        updated_at = excluded.updated_at;
    `,
    [
      input.normalized.deckId,
      input.ownerId,
      input.normalized.title,
      input.normalized.description,
      input.normalized.accentColor,
      input.normalized.visibility,
      input.normalized.sourceLanguage,
      input.normalized.targetLanguage,
      input.createdAt,
      input.updatedAt,
    ],
  );
}

export async function replaceLocalCardsAsync(input: {
  tx: DeckSaveTx;
  normalized: NormalizedDeckSaveInput;
  existingCardRows: LocalDeckCardRecord[];
}): Promise<void> {
  const existingRowsById = new Map(input.existingCardRows.map((card) => [card.id, card]));
  const retainedCardIds = new Set(input.normalized.persistedCards.map((card) => card.id));

  for (const existingCard of input.existingCardRows) {
    if (!retainedCardIds.has(existingCard.id)) {
      await input.tx.runAsync(
        "DELETE FROM local_deck_cards WHERE deck_id = ? AND id = ?;",
        [input.normalized.deckId, existingCard.id],
      );
    }
  }

  for (const card of input.normalized.persistedCards) {
    await input.tx.runAsync(
      `
        INSERT INTO local_deck_cards (
          id, deck_id, term, meaning, pronunciation, part_of_speech, difficulty, example, example_translation, note, tags, synonyms, antonyms, related_expressions, source, image_uri, position, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          deck_id = excluded.deck_id,
          term = excluded.term,
          meaning = excluded.meaning,
          pronunciation = excluded.pronunciation,
          part_of_speech = excluded.part_of_speech,
          difficulty = excluded.difficulty,
          example = excluded.example,
          example_translation = excluded.example_translation,
          note = excluded.note,
          tags = excluded.tags,
          synonyms = excluded.synonyms,
          antonyms = excluded.antonyms,
          related_expressions = excluded.related_expressions,
          source = excluded.source,
          image_uri = excluded.image_uri,
          position = excluded.position,
          updated_at = excluded.updated_at;
      `,
      [
        card.id,
        input.normalized.deckId,
        card.term,
        card.meaning,
        card.pronunciation,
        card.partOfSpeech,
        card.difficulty,
        card.example,
        card.exampleTranslation,
        card.note,
        card.tagsJson,
        card.synonyms,
        card.antonyms,
        card.relatedExpressions,
        card.source,
        card.imageUri,
        card.position,
        existingRowsById.get(card.id)?.createdAt ?? card.createdAt,
        card.updatedAt,
      ],
    );
  }
}

export async function insertDeckSaveActivitiesAsync(input: {
  tx: DeckSaveTx;
  normalized: NormalizedDeckSaveInput;
  existingCardRows: LocalDeckCardRecord[];
  existingDeck: boolean;
  createdAt: string;
}): Promise<void> {
  const existingCardsById = new Map(
    input.existingCardRows.map((card) => [card.id, mapCard(card)]),
  );
  const activities = buildDeckActivities({
    existingDeck: input.existingDeck,
    existingCardsById,
    persistedCards: input.normalized.persistedCards,
  });

  for (const activity of activities.slice(-12)) {
    await input.tx.runAsync(
      `
        INSERT INTO local_deck_activities (id, deck_id, activity_type, summary, created_at)
        VALUES (?, ?, ?, ?, ?);
      `,
      [
        createId("activity"),
        input.normalized.deckId,
        activity.type,
        activity.subject,
        input.createdAt,
      ],
    );
  }
}

export async function enqueueDeckSaveSyncAsync(input: {
  tx: DeckSaveTx;
  normalized: NormalizedDeckSaveInput;
  createdAt: string;
  updatedAt: string;
}): Promise<void> {
  await enqueuePendingSyncOperationAsync(input.tx, {
    entityType: "deck",
    entityId: input.normalized.deckId,
    operationType: "upsert",
    payload: buildRemoteDeckPayload(input.normalized, input.createdAt, input.updatedAt),
  });
}
