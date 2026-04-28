import type { AuthService } from "@/src/core/services/auth/AuthService";
import { getDatabaseAsync } from "@/src/core/database/client";
import { DeckSaveError, DeckDeleteError } from "@/src/core/errors";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";
import {
  LocalDeckActivityRecord,
  LocalDeckCardRecord,
  LocalDeckRecord,
} from "@/src/core/database/types";
import {
  CardDifficulty,
  Deck,
  DeckActivity,
  DeckActivityType,
  DeckCard,
  DeckDetail,
  DeckVisibility,
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

function normalizeTags(value: string[] | null | undefined) {
  return JSON.stringify(
    Array.from(
      new Set((value ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
    ),
  );
}

function parseTags(value: string | null | undefined) {
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

function normalizeDifficulty(value: CardDifficulty | null | undefined): CardDifficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

function normalizeVisibility(value: DeckVisibility | null | undefined): DeckVisibility {
  return value === "public" ? "public" : "private";
}

function mapDeck(row: DeckSummaryRow): Deck {
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

function mapCard(row: LocalDeckCardRecord): DeckCard {
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

function mapActivity(row: LocalDeckActivityRecord): DeckActivity {
  return {
    id: row.id,
    deckId: row.deckId,
    activityType: row.activityType,
    summary: row.summary,
    createdAt: row.createdAt,
  };
}

type PersistedCardInput = Omit<DeckCard, "deckId"> & {
  createdAt: string;
  updatedAt: string;
  tagsJson: string;
};

function getCardChangeSignature(card: DeckCard | PersistedCardInput) {
  return JSON.stringify({
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
    position: card.position,
  });
}

export class SqliteDeckRepository {
  constructor(private readonly auth: AuthService) {}

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
        WHERE deck_id = ?
        ORDER BY position ASC;
      `,
      [deckId],
    );

    const activityRows = await db.getAllAsync<LocalDeckActivityRecord>(
      `
        SELECT
          id,
          deck_id as deckId,
          activity_type as activityType,
          summary,
          created_at as createdAt
        FROM local_deck_activities
        WHERE deck_id = ?
        ORDER BY created_at DESC
        LIMIT 10;
      `,
      [deckId],
    );

    return {
      ...mapDeck(deckRow),
      cards: cardRows.map(mapCard),
      activities: activityRows.map(mapActivity),
    } satisfies DeckDetail;
  }

  async saveDeckAsync(payload: SaveDeckPayload) {
    const deckId = payload.id ?? createId("deck");
    try {
      const db = await getDatabaseAsync();
      const now = new Date().toISOString();
      const normalizedTitle = payload.title.trim();
      const normalizedDescription = normalizeOptionalText(payload.description);
      const accentColor = payload.accentColor ?? "#0F766E";
      const visibility = normalizeVisibility(payload.visibility);
      const sourceLanguage = normalizeOptionalText(payload.sourceLanguage) ?? "en";
      const targetLanguage = normalizeOptionalText(payload.targetLanguage) ?? "ko";
      const persistedCards = [...payload.cards]
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
      });

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
        const existingCardRows = await tx.getAllAsync<LocalDeckCardRecord>(
          `
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
            WHERE deck_id = ?;
          `,
          [deckId],
        );

        const createdAt = existingDeck?.createdAt ?? now;
        const existingRowsById = new Map(existingCardRows.map((card) => [card.id, card]));
        const existingCardsById = new Map(
          existingCardRows.map((card) => [card.id, mapCard(card)]),
        );

        await tx.runAsync(
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
            deckId,
            this.auth.getCurrentUserId(),
            normalizedTitle,
            normalizedDescription,
            accentColor,
            visibility,
            sourceLanguage,
            targetLanguage,
            createdAt,
            now,
          ],
        );

        const retainedCardIds = new Set(persistedCards.map((card) => card.id));
        for (const existingCard of existingCardsById.values()) {
          if (!retainedCardIds.has(existingCard.id)) {
            await tx.runAsync("DELETE FROM local_deck_cards WHERE deck_id = ? AND id = ?;", [
              deckId,
              existingCard.id,
            ]);
          }
        }

        for (const card of persistedCards) {
          await tx.runAsync(
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
              deckId,
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

        const activities: {
          type: DeckActivityType;
          subject: string;
        }[] = [];

        if (existingDeck) {
          activities.push({ type: "deck_updated", subject: "" });
        }

        for (const card of persistedCards) {
          const existingCard = existingCardsById.get(card.id);
          if (!existingCard) {
            activities.push({ type: "card_added", subject: card.term });
            continue;
          }

          if (getCardChangeSignature(existingCard) !== getCardChangeSignature(card)) {
            activities.push({ type: "card_updated", subject: card.term });
          }
        }

        for (const existingCard of existingCardsById.values()) {
          if (!retainedCardIds.has(existingCard.id)) {
            activities.push({
              type: "card_deleted",
              subject: existingCard.term,
            });
          }
        }

        for (const activity of activities.slice(-12)) {
          await tx.runAsync(
            `
              INSERT INTO local_deck_activities (id, deck_id, activity_type, summary, created_at)
              VALUES (?, ?, ?, ?, ?);
            `,
            [createId("activity"), deckId, activity.type, activity.subject, now],
          );
        }

        await enqueuePendingSyncOperationAsync(tx, {
          entityType: "deck",
          entityId: deckId,
          operationType: "upsert",
          payload: {
            deck: {
              id: deckId,
              title: normalizedTitle,
              description: normalizedDescription,
              accentColor,
              visibility,
              sourceLanguage,
              targetLanguage,
              deletedAt: null,
              createdAt,
              updatedAt: now,
            },
            cards: persistedCards.map((card) => ({
              id: card.id,
              deckId,
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
              position: card.position,
              deletedAt: null,
              createdAt: card.createdAt,
              updatedAt: card.updatedAt,
            })),
          },
        });
      });

      const savedDeck = await this.getDeckByIdAsync(deckId);

      if (!savedDeck) {
        throw new DeckSaveError({ context: { deckId } });
      }

      return savedDeck;
    } catch (error) {
      if (error instanceof DeckSaveError) {
        throw error;
      }
      throw new DeckSaveError({ context: { deckId }, cause: error });
    }
  }

  async deleteDeckAsync(deckId: string) {
    try {
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
    } catch (error) {
      if (error instanceof DeckDeleteError) {
        throw error;
      }
      throw new DeckDeleteError({ context: { deckId }, cause: error });
    }
  }

  async listPendingDeckOpsAsync() {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<{
      id: string;
      entity_id: string;
      operation_type: "upsert" | "delete";
      payload: string | null;
      attempt_count: number;
      available_at: string;
    }>(
      `SELECT id, entity_id, operation_type, payload, attempt_count, available_at
       FROM pending_sync_operations
       WHERE entity_type = 'deck' AND status = 'pending'
         AND available_at <= ?
       ORDER BY created_at ASC;`,
      [new Date().toISOString()],
    );
    return rows.map((r) => ({
      id: r.id,
      entityId: r.entity_id,
      operationType: r.operation_type,
      payload: r.payload ? JSON.parse(r.payload) : null,
      attemptCount: r.attempt_count,
      availableAt: r.available_at,
    }));
  }

  async markOpProcessingAsync(opId: string) {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `UPDATE pending_sync_operations
       SET status = 'processing', updated_at = ?
       WHERE id = ?;`,
      [new Date().toISOString(), opId],
    );
  }

  async deleteOpAsync(opId: string) {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM pending_sync_operations WHERE id = ?;", [opId]);
  }

  async markOpFailedAsync(
    opId: string,
    error: { message: string; permanent: boolean },
    nextAvailableAt: string,
  ) {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE pending_sync_operations
       SET status = ?, attempt_count = attempt_count + 1,
           available_at = ?, last_error = ?, updated_at = ?
       WHERE id = ?;`,
      [
        error.permanent ? "failed" : "pending",
        nextAvailableAt,
        error.message,
        now,
        opId,
      ],
    );
  }

  async countFailedDeckOpsAsync() {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_sync_operations
       WHERE entity_type = 'deck' AND status = 'failed';`,
    );
    return row?.count ?? 0;
  }

  async markDeckSyncedAsync(deckId: string) {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE local_decks
       SET sync_state = 'synced', last_synced_at = ?
       WHERE id = ?;`,
      [now, deckId],
    );
  }

  async applyRemoteDeckAsync(payload: RemoteDeckPayload): Promise<void> {
    const db = await getDatabaseAsync();
    const ownerId = this.auth.getCurrentUserId();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await mergeRemoteDeckIntoTx(
        {
          // cast needed to bridge MergeRemoteDeckTx (unknown[]) with expo-sqlite SQLiteBindParams
          runAsync: (sql, params) => tx.runAsync(sql, params as any) as Promise<unknown>,
        },
        ownerId,
        payload,
      );
    });
  }
}

export interface MergeRemoteDeckTx {
  runAsync(sql: string, params: unknown[]): Promise<unknown>;
}

export async function mergeRemoteDeckIntoTx(
  tx: MergeRemoteDeckTx,
  ownerId: string,
  payload: RemoteDeckPayload,
): Promise<void> {
  const isDeleted = payload.deck.deletedAt ? 1 : 0;
  const now = new Date().toISOString();

  await tx.runAsync(
    `INSERT INTO local_decks (
      id, owner_id, title, description, source_type, accent_color,
      visibility, source_language, target_language, is_deleted,
      sync_state, last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      accent_color = excluded.accent_color,
      visibility = excluded.visibility,
      source_language = excluded.source_language,
      target_language = excluded.target_language,
      is_deleted = excluded.is_deleted,
      sync_state = 'synced',
      last_synced_at = excluded.last_synced_at,
      updated_at = excluded.updated_at;`,
    [
      payload.deck.id,
      ownerId,
      payload.deck.title,
      payload.deck.description,
      payload.deck.accentColor,
      payload.deck.visibility,
      payload.deck.sourceLanguage,
      payload.deck.targetLanguage,
      isDeleted,
      now,
      payload.deck.createdAt,
      payload.deck.updatedAt,
    ],
  );

  await tx.runAsync(
    "DELETE FROM local_deck_cards WHERE deck_id = ?;",
    [payload.deck.id],
  );

  for (const card of payload.cards) {
    if (card.deletedAt) continue;
    await tx.runAsync(
      `INSERT INTO local_deck_cards (
        id, deck_id, term, meaning, pronunciation, part_of_speech, difficulty,
        example, example_translation, note, tags, synonyms, antonyms,
        related_expressions, source, image_uri, position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?);`,
      [
        card.id,
        card.deckId,
        card.term,
        card.meaning,
        card.pronunciation,
        card.partOfSpeech,
        card.difficulty,
        card.example,
        card.exampleTranslation,
        card.note,
        JSON.stringify(card.tags),
        card.synonyms,
        card.antonyms,
        card.relatedExpressions,
        card.source,
        card.position,
        card.createdAt,
        card.updatedAt,
      ],
    );
  }
}
