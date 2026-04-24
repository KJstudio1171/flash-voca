import {
  StoreBundleDetail,
  StoreBundleSummary,
} from "@/src/core/domain/models";
import { logger } from "@/src/core/errors";
import { BundleRepository } from "@/src/core/repositories/contracts/BundleRepository";
import { CatalogSyncService } from "@/src/core/services/CatalogSyncService";
import { EntitlementService } from "@/src/core/services/EntitlementService";

export class StoreService {
  constructor(
    private readonly bundleRepository: BundleRepository,
    private readonly entitlementService: EntitlementService,
    private readonly catalogSyncService?: CatalogSyncService,
  ) {}

  async listCatalogAsync(): Promise<StoreBundleSummary[]> {
    await this.syncCatalogBestEffortAsync();

    const [bundles, entitlements] = await Promise.all([
      this.bundleRepository.listBundlesAsync(),
      this.entitlementService.listActiveEntitlementsAsync(),
    ]);

    const ownedBundleIds = new Set(entitlements.map((item) => item.bundleId));

    return bundles.map((bundle) => ({
      ...bundle,
      owned: ownedBundleIds.has(bundle.id),
    }));
  }

  async getBundleDetailAsync(bundleId: string): Promise<StoreBundleDetail | null> {
    await this.syncCatalogBestEffortAsync();

    const [bundle, owned] = await Promise.all([
      this.bundleRepository.getBundleByIdAsync(bundleId),
      this.entitlementService.hasBundleAccessAsync(bundleId),
    ]);

    if (!bundle) {
      return null;
    }

    return {
      ...bundle,
      owned,
    };
  }

  private async syncCatalogBestEffortAsync(): Promise<void> {
    try {
      await this.catalogSyncService?.syncAsync();
    } catch (error) {
      logger.warn("Catalog sync failed; falling back to cached catalog.", {
        error,
      });
    }
  }
}
