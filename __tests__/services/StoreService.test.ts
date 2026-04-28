import type {
  Bundle,
  BundleDetail,
  Entitlement,
} from "@/src/core/domain/models";
import type { BundleRepository } from "@/src/core/repositories/contracts/BundleRepository";
import type { EntitlementRepository } from "@/src/core/repositories/contracts/EntitlementRepository";
import type { RemoteEntitlementGateway } from "@/src/core/repositories/contracts/RemoteEntitlementGateway";
import { EntitlementService } from "@/src/core/services/EntitlementService";
import { StoreService } from "@/src/core/services/StoreService";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type { CatalogSyncService } from "@/src/core/services/CatalogSyncService";
import type { AuthService } from "@/src/core/services/auth/AuthService";

const bundle: Bundle = {
  id: "bundle-1",
  title: "Starter Bundle",
  description: "Official starter words.",
  priceText: "$4.99",
  currencyCode: "USD",
  coverColor: "#EA580C",
  deckCount: 1,
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z",
};

const bundleDetail: BundleDetail = {
  ...bundle,
  items: [
    {
      id: "item-1",
      bundleId: "bundle-1",
      deckId: "deck-1",
      deckTitle: "Starter Deck",
      cardCount: 100,
      position: 0,
    },
  ],
};

const entitlement: Entitlement = {
  id: "entitlement-1",
  userId: "local-user",
  bundleId: "bundle-1",
  provider: "test",
  providerRef: null,
  status: "active",
  grantedAt: "2026-04-24T00:00:00.000Z",
  expiresAt: null,
  syncedAt: "2026-04-24T00:00:00.000Z",
};

function createBundleRepository(): BundleRepository {
  return {
    listBundlesAsync: jest.fn().mockResolvedValue([bundle]),
    getBundleByIdAsync: jest.fn().mockResolvedValue(bundleDetail),
  };
}

function createEntitlementService() {
  const repository: EntitlementRepository = {
    listActiveEntitlementsAsync: jest.fn().mockResolvedValue([entitlement]),
    hasBundleAccessAsync: jest.fn().mockResolvedValue(true),
    replaceCachedEntitlementsAsync: jest.fn().mockResolvedValue(undefined),
    clearCachedEntitlementsAsync: jest.fn().mockResolvedValue(undefined),
  };
  const remoteGateway: RemoteEntitlementGateway = {
    pullEntitlementsAsync: jest.fn().mockResolvedValue([]),
  };
  const billingGateway: BillingGateway = {
    purchaseBundleAsync: jest.fn().mockResolvedValue(undefined),
    restorePurchasesAsync: jest.fn().mockResolvedValue(undefined),
  };

  const authService: AuthService = {
    bootstrapAsync: jest.fn(),
    getCurrentUserId: jest.fn().mockReturnValue("test-user"),
    getState: jest.fn().mockReturnValue({ kind: "local-temp", userId: "test-user" }),
    linkGoogleAsync: jest.fn(),
    subscribe: jest.fn().mockReturnValue(() => {}),
  };
  return new EntitlementService(repository, remoteGateway, billingGateway, authService);
}

function createCatalogSyncService(): CatalogSyncService {
  return {
    syncAsync: jest.fn().mockResolvedValue("synced"),
  } as unknown as CatalogSyncService;
}

function createFailingCatalogSyncService(): CatalogSyncService {
  return {
    syncAsync: jest.fn().mockRejectedValue(new Error("network failed")),
  } as unknown as CatalogSyncService;
}

describe("StoreService", () => {
  it("syncs the public catalog before listing bundles", async () => {
    const bundleRepository = createBundleRepository();
    const catalogSyncService = createCatalogSyncService();
    const service = new StoreService(
      bundleRepository,
      createEntitlementService(),
      catalogSyncService,
    );

    const result = await service.listCatalogAsync();

    expect(catalogSyncService.syncAsync).toHaveBeenCalled();
    expect(bundleRepository.listBundlesAsync).toHaveBeenCalled();
    expect(result[0]).toMatchObject({ id: "bundle-1", owned: true });
  });

  it("syncs the public catalog before reading bundle detail metadata", async () => {
    const bundleRepository = createBundleRepository();
    const catalogSyncService = createCatalogSyncService();
    const service = new StoreService(
      bundleRepository,
      createEntitlementService(),
      catalogSyncService,
    );

    const result = await service.getBundleDetailAsync("bundle-1");

    expect(catalogSyncService.syncAsync).toHaveBeenCalled();
    expect(bundleRepository.getBundleByIdAsync).toHaveBeenCalledWith("bundle-1");
    expect(result?.items[0]).toMatchObject({
      deckTitle: "Starter Deck",
      cardCount: 100,
    });
  });

  it("falls back to cached catalog data when public catalog sync fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const bundleRepository = createBundleRepository();
    const catalogSyncService = createFailingCatalogSyncService();
    const service = new StoreService(
      bundleRepository,
      createEntitlementService(),
      catalogSyncService,
    );

    try {
      const result = await service.listCatalogAsync();

      expect(catalogSyncService.syncAsync).toHaveBeenCalled();
      expect(bundleRepository.listBundlesAsync).toHaveBeenCalled();
      expect(result[0]).toMatchObject({ id: "bundle-1", owned: true });
    } finally {
      warnSpy.mockRestore();
    }
  });
});
