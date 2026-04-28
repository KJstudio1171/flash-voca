import { SyncError } from "@/src/core/errors";
import {
  RemoteBundleItem,
  RemoteCatalogBundle,
  RemoteCatalogGateway,
  RemoteOfficialDeckSummary,
} from "@/src/core/repositories/contracts/RemoteCatalogGateway";
import { getSupabaseClient } from "@/src/core/supabase/client";

type BundleRow = {
  id: string;
  title: string;
  description: string;
  price_text: string;
  currency_code: string;
  play_product_id: string | null;
  cover_color: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type OfficialDeckRow = {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
  accent_color: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type BundleItemRow = {
  id: string;
  bundle_id: string;
  deck_id: string;
  position: number;
};

function mapBundle(row: BundleRow): RemoteCatalogBundle {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceText: row.price_text,
    currencyCode: row.currency_code,
    playProductId: row.play_product_id,
    coverColor: row.cover_color,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOfficialDeck(row: OfficialDeckRow): RemoteOfficialDeckSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    cardCount: Number(row.card_count ?? 0),
    accentColor: row.accent_color,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBundleItem(row: BundleItemRow): RemoteBundleItem {
  return {
    id: row.id,
    bundleId: row.bundle_id,
    deckId: row.deck_id,
    position: Number(row.position ?? 0),
  };
}

export class SupabaseCatalogGateway implements RemoteCatalogGateway {
  async pullCatalogAsync() {
    const client = getSupabaseClient();

    if (!client) {
      return null;
    }

    const [bundlesResult, decksResult, itemsResult] = await Promise.all([
      client
        .from("bundles")
        .select(
          "id, title, description, price_text, currency_code, play_product_id, cover_color, is_published, created_at, updated_at",
        )
        .eq("is_published", true)
        .order("updated_at", { ascending: false }),
      client
        .from("official_decks")
        .select(
          "id, title, description, card_count, accent_color, is_published, created_at, updated_at",
        )
        .eq("is_published", true),
      client
        .from("bundle_items")
        .select("id, bundle_id, deck_id, position")
        .order("position", { ascending: true }),
    ]);

    const error = bundlesResult.error ?? decksResult.error ?? itemsResult.error;
    if (error) {
      throw new SyncError({ cause: error });
    }

    const bundles = ((bundlesResult.data ?? []) as BundleRow[]).map(mapBundle);
    const officialDecks = ((decksResult.data ?? []) as OfficialDeckRow[]).map(
      mapOfficialDeck,
    );
    const publishedBundleIds = new Set(bundles.map((bundle) => bundle.id));
    const publishedDeckIds = new Set(officialDecks.map((deck) => deck.id));
    const bundleItems = ((itemsResult.data ?? []) as BundleItemRow[])
      .map(mapBundleItem)
      .filter(
        (item) =>
          publishedBundleIds.has(item.bundleId) && publishedDeckIds.has(item.deckId),
      );

    return {
      bundles,
      officialDecks,
      bundleItems,
    };
  }
}
