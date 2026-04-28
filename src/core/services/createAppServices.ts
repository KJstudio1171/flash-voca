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
import { getDatabaseAsync } from "@/src/core/database/client";
import { getSupabaseClient } from "@/src/core/supabase/client";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import { NoopAuthService } from "@/src/core/services/auth/NoopAuthService";
import { SupabaseAuthAdapter } from "@/src/core/services/auth/SupabaseAuthAdapter";
import { SupabaseAuthService } from "@/src/core/services/auth/SupabaseAuthService";
import { RealGoogleSignInClient } from "@/src/core/services/auth/google/GoogleSignInClient";
import { AsyncStorageUserIdStorage } from "@/src/core/services/auth/userIdStorage";
import { rebindUserIdAsync } from "@/src/core/services/auth/authMigration";
import { randomUUID } from "expo-crypto";
import {
  AsyncStorageLocaleStorage,
  ExpoLocaleDetector,
  LocaleService,
} from "@/src/shared/i18n";

function createAuthService(): AuthService {
  const storage = new AsyncStorageUserIdStorage();
  const supabaseClient = getSupabaseClient();
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

  if (!supabaseClient || !googleWebClientId) {
    return new NoopAuthService(storage);
  }

  return new SupabaseAuthService({
    storage,
    supabase: new SupabaseAuthAdapter(supabaseClient),
    google: new RealGoogleSignInClient(),
    googleWebClientId,
    randomId: () => randomUUID(),
    runMigrationInTxAsync: async (fromUserId, toUserId) => {
      const db = await getDatabaseAsync();
      await db.withExclusiveTransactionAsync(async (tx) => {
        await rebindUserIdAsync(
          {
            runAsync: (sql, params) =>
              tx.runAsync(sql, params as import("expo-sqlite").SQLiteBindParams) as Promise<unknown>,
          },
          { fromUserId, toUserId },
        );
      });
    },
  });
}

export function createAppServices() {
  const authService = createAuthService();
  const deckRepository = new SqliteDeckRepository(authService);
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
    authService,
  );
  const localeService = new LocaleService(
    new AsyncStorageLocaleStorage(),
    new ExpoLocaleDetector(),
  );

  return {
    authService,
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
    studySessionService: new StudySessionService(
      deckRepository,
      studyRepository,
      authService,
    ),
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
