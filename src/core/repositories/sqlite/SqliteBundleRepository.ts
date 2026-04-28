import { getDatabaseAsync } from "@/src/core/database/client";
import { Bundle, BundleDetail } from "@/src/core/domain/models";
import { BundleQueryError } from "@/src/core/errors";

type BundleRow = {
  id: string;
  title: string;
  description: string;
  priceText: string;
  currencyCode: string;
  playProductId: string | null;
  coverColor: string;
  deckCount: number;
  createdAt: string;
  updatedAt: string;
};

type BundleItemRow = {
  id: string;
  bundleId: string;
  deckId: string;
  deckTitle: string;
  cardCount: number;
  position: number;
};

function mapBundle(row: BundleRow): Bundle {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceText: row.priceText,
    currencyCode: row.currencyCode,
    playProductId: row.playProductId ?? null,
    coverColor: row.coverColor,
    deckCount: Number(row.deckCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class SqliteBundleRepository {
  async listBundlesAsync() {
    try {
      const db = await getDatabaseAsync();
      const rows = await db.getAllAsync<BundleRow>(
        `
          SELECT
            b.id as id,
            b.title as title,
            b.description as description,
            b.price_text as priceText,
            b.currency_code as currencyCode,
            b.play_product_id as playProductId,
            b.cover_color as coverColor,
            b.created_at as createdAt,
            b.updated_at as updatedAt,
            COUNT(bi.id) as deckCount
          FROM bundles b
          LEFT JOIN bundle_items bi ON bi.bundle_id = b.id
          WHERE b.is_published = 1
          GROUP BY b.id
          ORDER BY b.created_at DESC;
        `,
      );

      return rows.map(mapBundle);
    } catch (error) {
      if (error instanceof BundleQueryError) {
        throw error;
      }
      throw new BundleQueryError({ cause: error });
    }
  }

  async getBundleByIdAsync(bundleId: string) {
    try {
      const db = await getDatabaseAsync();
      const bundleRow = await db.getFirstAsync<BundleRow>(
        `
          SELECT
            b.id as id,
            b.title as title,
            b.description as description,
            b.price_text as priceText,
            b.currency_code as currencyCode,
            b.play_product_id as playProductId,
            b.cover_color as coverColor,
            b.created_at as createdAt,
            b.updated_at as updatedAt,
            COUNT(bi.id) as deckCount
          FROM bundles b
          LEFT JOIN bundle_items bi ON bi.bundle_id = b.id
          WHERE b.id = ? AND b.is_published = 1
          GROUP BY b.id
          LIMIT 1;
        `,
        [bundleId],
      );

      if (!bundleRow) {
        return null;
      }

      const itemRows = await db.getAllAsync<BundleItemRow>(
        `
          SELECT
            bi.id as id,
            bi.bundle_id as bundleId,
            bi.deck_id as deckId,
            COALESCE(cds.title, d.title) as deckTitle,
            bi.position as position,
            COALESCE(cds.card_count, COUNT(c.id)) as cardCount
          FROM bundle_items bi
          INNER JOIN local_decks d ON d.id = bi.deck_id
          LEFT JOIN catalog_deck_summaries cds ON cds.deck_id = bi.deck_id
          LEFT JOIN local_deck_cards c ON c.deck_id = d.id
          WHERE bi.bundle_id = ? AND d.is_deleted = 0
          GROUP BY bi.id
          ORDER BY bi.position ASC;
        `,
        [bundleId],
      );

      return {
        ...mapBundle(bundleRow),
        items: itemRows.map((row) => ({
          id: row.id,
          bundleId: row.bundleId,
          deckId: row.deckId,
          deckTitle: row.deckTitle,
          cardCount: Number(row.cardCount ?? 0),
          position: Number(row.position ?? 0),
        })),
      } satisfies BundleDetail;
    } catch (error) {
      if (error instanceof BundleQueryError) {
        throw error;
      }
      throw new BundleQueryError({ context: { bundleId }, cause: error });
    }
  }
}
