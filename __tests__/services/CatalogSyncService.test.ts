import { CatalogSyncService } from "@/src/core/services/CatalogSyncService";
import type { CatalogCacheRepository } from "@/src/core/repositories/contracts/CatalogCacheRepository";
import type {
  RemoteCatalogGateway,
  RemoteCatalogSnapshot,
} from "@/src/core/repositories/contracts/RemoteCatalogGateway";

const snapshot: RemoteCatalogSnapshot = {
  bundles: [
    {
      id: "bundle-1",
      title: "Starter Bundle",
      description: "Official starter words.",
      priceText: "$4.99",
      currencyCode: "USD",
      playProductId: null,
      coverColor: "#EA580C",
      isPublished: true,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
  ],
  officialDecks: [
    {
      id: "deck-1",
      title: "Starter Deck",
      description: null,
      cardCount: 100,
      accentColor: "#EA580C",
      isPublished: true,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
  ],
  bundleItems: [
    {
      id: "item-1",
      bundleId: "bundle-1",
      deckId: "deck-1",
      position: 0,
    },
  ],
};

function createGateway(result: RemoteCatalogSnapshot | null): RemoteCatalogGateway {
  return {
    pullCatalogAsync: jest.fn().mockResolvedValue(result),
  };
}

function createCache(): CatalogCacheRepository {
  return {
    replaceCatalogAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe("CatalogSyncService", () => {
  it("skips cache replacement when Supabase config is unavailable", async () => {
    const gateway = createGateway(null);
    const cache = createCache();
    const service = new CatalogSyncService(gateway, cache);

    const result = await service.syncAsync();

    expect(result).toBe("skipped");
    expect(cache.replaceCatalogAsync).not.toHaveBeenCalled();
  });

  it("writes pulled public catalog into the local cache", async () => {
    const gateway = createGateway(snapshot);
    const cache = createCache();
    const service = new CatalogSyncService(gateway, cache);

    const result = await service.syncAsync();

    expect(result).toBe("synced");
    expect(cache.replaceCatalogAsync).toHaveBeenCalledWith(snapshot);
  });

  it("reuses a fresh sync result inside the ttl window", async () => {
    const gateway = createGateway(snapshot);
    const cache = createCache();
    const service = new CatalogSyncService(gateway, cache);

    await service.syncAsync();
    const result = await service.syncAsync();

    expect(result).toBe("fresh");
    expect(gateway.pullCatalogAsync).toHaveBeenCalledTimes(1);
  });
});
