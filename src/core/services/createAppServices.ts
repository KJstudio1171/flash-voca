import { SqliteBundleRepository } from "@/src/core/repositories/sqlite/SqliteBundleRepository";
import { SqliteCatalogCacheRepository } from "@/src/core/repositories/sqlite/SqliteCatalogCacheRepository";
import { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { SqliteStudyRepository } from "@/src/core/repositories/sqlite/SqliteStudyRepository";
import { SupabaseCatalogGateway } from "@/src/core/repositories/supabase/SupabaseCatalogGateway";
import { SupabaseEntitlementGateway } from "@/src/core/repositories/supabase/SupabaseEntitlementGateway";
import { BootstrapService } from "@/src/core/services/BootstrapService";
import { CatalogSyncService } from "@/src/core/services/CatalogSyncService";
import { DeckService } from "@/src/core/services/DeckService";
import { EntitlementService } from "@/src/core/services/EntitlementService";
import { StoreService } from "@/src/core/services/StoreService";
import { StudySessionService } from "@/src/core/services/StudySessionService";
import { NoopBillingGateway } from "@/src/core/services/billing/NoopBillingGateway";
import {
  AsyncStorageLocaleStorage,
  ExpoLocaleDetector,
  LocaleService,
} from "@/src/shared/i18n";

export function createAppServices() {
  const deckRepository = new SqliteDeckRepository();
  const bundleRepository = new SqliteBundleRepository();
  const catalogCacheRepository = new SqliteCatalogCacheRepository();
  const entitlementRepository = new SqliteEntitlementRepository();
  const studyRepository = new SqliteStudyRepository();
  const catalogSyncService = new CatalogSyncService(
    new SupabaseCatalogGateway(),
    catalogCacheRepository,
  );
  const entitlementService = new EntitlementService(
    entitlementRepository,
    new SupabaseEntitlementGateway(),
    new NoopBillingGateway(),
  );
  const localeService = new LocaleService(
    new AsyncStorageLocaleStorage(),
    new ExpoLocaleDetector(),
  );

  return {
    bootstrapService: new BootstrapService(localeService),
    catalogSyncService,
    localeService,
    deckService: new DeckService(deckRepository),
    storeService: new StoreService(
      bundleRepository,
      entitlementService,
      catalogSyncService,
    ),
    entitlementService,
    studySessionService: new StudySessionService(deckRepository, studyRepository),
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
