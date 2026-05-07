import { SqliteAppMetaRepository } from "@/src/core/repositories/sqlite/SqliteAppMetaRepository";
import { SqliteBundleRepository } from "@/src/core/repositories/sqlite/SqliteBundleRepository";
import { SqliteCatalogCacheRepository } from "@/src/core/repositories/sqlite/SqliteCatalogCacheRepository";
import { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { SqlitePendingSyncRepository } from "@/src/core/repositories/sqlite/SqlitePendingSyncRepository";
import { SqliteStudyRepository } from "@/src/core/repositories/sqlite/SqliteStudyRepository";
import type { AuthService } from "@/src/core/services/auth/AuthService";

export function createLocalRepositories(authService: AuthService) {
  return {
    appMeta: new SqliteAppMetaRepository(),
    deckRepository: new SqliteDeckRepository(authService),
    bundleRepository: new SqliteBundleRepository(),
    catalogCacheRepository: new SqliteCatalogCacheRepository(),
    entitlementRepository: new SqliteEntitlementRepository(),
    pendingSyncRepository: new SqlitePendingSyncRepository(),
    studyRepository: new SqliteStudyRepository(),
  };
}
