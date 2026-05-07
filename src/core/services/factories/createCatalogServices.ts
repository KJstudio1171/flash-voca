import type { SqliteBundleRepository } from "@/src/core/repositories/sqlite/SqliteBundleRepository";
import type { SqliteCatalogCacheRepository } from "@/src/core/repositories/sqlite/SqliteCatalogCacheRepository";
import type { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { SupabaseCatalogGateway } from "@/src/core/repositories/supabase/SupabaseCatalogGateway";
import { CatalogSyncService } from "@/src/core/services/CatalogSyncService";
import { StoreService } from "@/src/core/services/StoreService";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import { createEntitlementServices } from "@/src/core/services/factories/createEntitlementServices";

export function createCatalogServices(input: {
  authService: AuthService;
  bundleRepository: SqliteBundleRepository;
  catalogCacheRepository: SqliteCatalogCacheRepository;
  entitlementRepository: SqliteEntitlementRepository;
}) {
  const catalogSyncService = new CatalogSyncService(
    new SupabaseCatalogGateway(),
    input.catalogCacheRepository,
  );
  const { entitlementService } = createEntitlementServices(input);

  return {
    catalogSyncService,
    entitlementService,
    storeService: new StoreService(
      input.bundleRepository,
      entitlementService,
      catalogSyncService,
    ),
  };
}
