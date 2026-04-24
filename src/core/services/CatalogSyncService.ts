import type { CatalogCacheRepository } from "@/src/core/repositories/contracts/CatalogCacheRepository";
import type { RemoteCatalogGateway } from "@/src/core/repositories/contracts/RemoteCatalogGateway";

const CATALOG_SYNC_TTL_MS = 30_000;

export type CatalogSyncResult = "skipped" | "synced" | "fresh";

export class CatalogSyncService {
  private lastSyncedAt = 0;
  private inFlightSync: Promise<CatalogSyncResult> | null = null;

  constructor(
    private readonly remoteGateway: RemoteCatalogGateway,
    private readonly cacheRepository: CatalogCacheRepository,
  ) {}

  async syncAsync(force = false): Promise<CatalogSyncResult> {
    if (!force && Date.now() - this.lastSyncedAt < CATALOG_SYNC_TTL_MS) {
      return "fresh";
    }

    if (this.inFlightSync) {
      return this.inFlightSync;
    }

    this.inFlightSync = this.performSyncAsync();

    try {
      return await this.inFlightSync;
    } finally {
      this.inFlightSync = null;
    }
  }

  private async performSyncAsync(): Promise<CatalogSyncResult> {
    const snapshot = await this.remoteGateway.pullCatalogAsync();

    if (!snapshot) {
      return "skipped";
    }

    await this.cacheRepository.replaceCatalogAsync(snapshot);
    this.lastSyncedAt = Date.now();
    return "synced";
  }
}
