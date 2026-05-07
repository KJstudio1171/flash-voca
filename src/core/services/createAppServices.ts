import { getSupabaseClient } from "@/src/core/supabase/client";
import { createAuthService } from "@/src/core/services/factories/createAuthService";
import { createBillingServices } from "@/src/core/services/factories/createBillingServices";
import { createBootstrapServices } from "@/src/core/services/factories/createBootstrapServices";
import { createCatalogServices } from "@/src/core/services/factories/createCatalogServices";
import { createDeckStudyServices } from "@/src/core/services/factories/createDeckStudyServices";
import { createLocalRepositories } from "@/src/core/services/factories/createLocalRepositories";
import { createSyncServices } from "@/src/core/services/factories/createSyncServices";

export function createAppServices() {
  const supabaseClient = getSupabaseClient();
  const authService = createAuthService();
  const repositories = createLocalRepositories(authService);
  const bootstrap = createBootstrapServices();
  const catalog = createCatalogServices({
    authService,
    bundleRepository: repositories.bundleRepository,
    catalogCacheRepository: repositories.catalogCacheRepository,
    entitlementRepository: repositories.entitlementRepository,
  });
  const deckStudy = createDeckStudyServices({
    appMeta: repositories.appMeta,
    authService,
    deckRepository: repositories.deckRepository,
    studyRepository: repositories.studyRepository,
  });
  const sync = createSyncServices({
    appMeta: repositories.appMeta,
    authService,
    deckRepository: repositories.deckRepository,
    pendingSyncRepository: repositories.pendingSyncRepository,
    studyRepository: repositories.studyRepository,
    supabaseClient,
  });
  const billing = createBillingServices({
    entitlementRepository: repositories.entitlementRepository,
    supabaseClient,
  });

  return {
    authService,
    bootstrapService: bootstrap.bootstrapService,
    catalogSyncService: catalog.catalogSyncService,
    localeService: bootstrap.localeService,
    deckRepository: repositories.deckRepository,
    pendingSyncRepository: repositories.pendingSyncRepository,
    deckService: deckStudy.deckService,
    deckSyncService: sync.deckSyncService,
    storeService: catalog.storeService,
    entitlementService: catalog.entitlementService,
    studySessionService: deckStudy.studySessionService,
    billingGateway: billing.billingGateway,
    purchaseVerification: billing.purchaseVerification,
    srsPreferenceService: deckStudy.srsPreferenceService,
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
