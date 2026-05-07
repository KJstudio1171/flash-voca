import type { AuthService } from "@/src/core/services/auth/AuthService";
import { getDatabaseAsync } from "@/src/core/database/client";
import { DeckSaveError, DeckDeleteError } from "@/src/core/errors";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";
import {
  LocalDeckActivityRecord,
  LocalDeckCardRecord,
} from "@/src/core/database/types";
import {
  DeckDetail,
  SaveDeckPayload,
} from "@/src/core/domain/models";
import { normalizeDeckSavePayload } from "@/src/core/repositories/sqlite/deckPersistence";
import {
  DECK_CARD_SELECT,
  DECK_SUMMARY_SELECT,
  mapActivity,
  mapCard,
  mapDeck,
} from "@/src/core/repositories/sqlite/deckRows";
import type { DeckSummaryRow } from "@/src/core/repositories/sqlite/deckRows";
import {
  enqueueDeckSaveSyncAsync,
  insertDeckSaveActivitiesAsync,
  loadDeckSaveContextAsync,
  replaceLocalCardsAsync,
  upsertLocalDeckAsync,
} from "@/src/core/repositories/sqlite/deckSavePersistence";
import { mergeRemoteDeckIntoTx } from "@/src/core/repositories/sqlite/SqliteRemoteDeckMerger";
import { enqueuePendingSyncOperationAsync } from "@/src/core/repositories/sqlite/shared/enqueuePendingSyncOperation";
import { createId } from "@/src/shared/utils/createId";

export class SqliteDeckRepository {
  constructor(private readonly auth: AuthService) {}

  async listDecksAsync() {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<DeckSummaryRow>(
      `
        ${DECK_SUMMARY_SELECT}
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
        ${DECK_SUMMARY_SELECT}
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
        ${DECK_CARD_SELECT}
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
      const normalized = normalizeDeckSavePayload(payload, deckId, now);

      await db.withExclusiveTransactionAsync(async (tx) => {
        const context = await loadDeckSaveContextAsync(tx, deckId, now);

        await upsertLocalDeckAsync({
          tx,
          ownerId: this.auth.getCurrentUserId(),
          normalized,
          createdAt: context.createdAt,
          updatedAt: now,
        });
        await replaceLocalCardsAsync({
          tx,
          normalized,
          existingCardRows: context.existingCardRows,
        });
        await insertDeckSaveActivitiesAsync({
          tx,
          normalized,
          existingCardRows: context.existingCardRows,
          existingDeck: context.existingDeck,
          createdAt: now,
        });
        await enqueueDeckSaveSyncAsync({
          tx,
          normalized,
          createdAt: context.createdAt,
          updatedAt: now,
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

  async hasPendingLocalChangesAsync(deckId: string): Promise<boolean> {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ syncState: string }>(
      `
        SELECT sync_state as syncState
        FROM local_decks
        WHERE id = ?
        LIMIT 1;
      `,
      [deckId],
    );
    return row?.syncState === "pending" || row?.syncState === "processing";
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

export { mergeRemoteDeckIntoTx };
