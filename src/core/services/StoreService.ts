import {
  StoreBundleDetail,
  StoreBundleSummary,
} from "@/src/core/domain/models";
import { BundleRepository } from "@/src/core/repositories/contracts/BundleRepository";
import { EntitlementService } from "@/src/core/services/EntitlementService";

export class StoreService {
  constructor(
    private readonly bundleRepository: BundleRepository,
    private readonly entitlementService: EntitlementService,
  ) {}

  async listCatalogAsync(): Promise<StoreBundleSummary[]> {
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
}
