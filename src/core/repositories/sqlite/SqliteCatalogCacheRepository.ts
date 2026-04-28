import { getDatabaseAsync } from "@/src/core/database/client";
import type { RemoteCatalogSnapshot } from "@/src/core/repositories/contracts/RemoteCatalogGateway";

export class SqliteCatalogCacheRepository {
  async replaceCatalogAsync(snapshot: RemoteCatalogSnapshot) {
    const db = await getDatabaseAsync();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync("DELETE FROM bundle_items;");
      await tx.runAsync("DELETE FROM bundles;");
      await tx.runAsync("DELETE FROM catalog_deck_summaries;");

      for (const deck of snapshot.officialDecks) {
        await tx.runAsync(
          `
            INSERT INTO local_decks (
              id, owner_id, title, description, source_type, accent_color, is_deleted, sync_state, last_synced_at, created_at, updated_at
            )
            VALUES (?, NULL, ?, ?, 'official', ?, 0, 'synced', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              owner_id = NULL,
              title = excluded.title,
              description = excluded.description,
              source_type = excluded.source_type,
              accent_color = excluded.accent_color,
              is_deleted = 0,
              sync_state = 'synced',
              last_synced_at = excluded.last_synced_at,
              updated_at = excluded.updated_at;
          `,
          [
            deck.id,
            deck.title,
            deck.description,
            deck.accentColor,
            now,
            deck.createdAt,
            deck.updatedAt,
          ],
        );

        await tx.runAsync(
          `
            INSERT INTO catalog_deck_summaries (
              deck_id, title, description, card_count, accent_color, is_published, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?);
          `,
          [
            deck.id,
            deck.title,
            deck.description,
            deck.cardCount,
            deck.accentColor,
            deck.isPublished ? 1 : 0,
            deck.updatedAt,
          ],
        );
      }

      for (const bundle of snapshot.bundles) {
        await tx.runAsync(
          `
            INSERT INTO bundles (
              id, title, description, price_text, currency_code, play_product_id, cover_color, is_published, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            bundle.id,
            bundle.title,
            bundle.description,
            bundle.priceText,
            bundle.currencyCode,
            bundle.playProductId,
            bundle.coverColor,
            bundle.isPublished ? 1 : 0,
            bundle.createdAt,
            bundle.updatedAt,
          ],
        );
      }

      for (const item of snapshot.bundleItems) {
        await tx.runAsync(
          `
            INSERT INTO bundle_items (id, bundle_id, deck_id, position)
            VALUES (?, ?, ?, ?);
          `,
          [item.id, item.bundleId, item.deckId, item.position],
        );
      }
    });
  }
}
