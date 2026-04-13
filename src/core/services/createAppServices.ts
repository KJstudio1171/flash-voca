import { SqliteBundleRepository } from "@/src/core/repositories/sqlite/SqliteBundleRepository";
import { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { SqliteStudyRepository } from "@/src/core/repositories/sqlite/SqliteStudyRepository";
import { SupabaseEntitlementGateway } from "@/src/core/repositories/supabase/SupabaseEntitlementGateway";
import { BootstrapService } from "@/src/core/services/BootstrapService";
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
  const entitlementRepository = new SqliteEntitlementRepository();
  const studyRepository = new SqliteStudyRepository();
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
    localeService,
    deckService: new DeckService(deckRepository),
    storeService: new StoreService(bundleRepository, entitlementService),
    entitlementService,
    studySessionService: new StudySessionService(deckRepository, studyRepository),
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
