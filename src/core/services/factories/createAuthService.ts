import { randomUUID } from "expo-crypto";

import { getDatabaseAsync } from "@/src/core/database/client";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import { NoopAuthService } from "@/src/core/services/auth/NoopAuthService";
import { SupabaseAuthAdapter } from "@/src/core/services/auth/SupabaseAuthAdapter";
import { SupabaseAuthService } from "@/src/core/services/auth/SupabaseAuthService";
import { rebindUserIdAsync } from "@/src/core/services/auth/authMigration";
import { RealGoogleSignInClient } from "@/src/core/services/auth/google/GoogleSignInClient";
import { AsyncStorageUserIdStorage } from "@/src/core/services/auth/userIdStorage";
import { getSupabaseClient } from "@/src/core/supabase/client";

export function createAuthService(): AuthService {
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
              tx.runAsync(
                sql,
                params as import("expo-sqlite").SQLiteBindParams,
              ) as Promise<unknown>,
          },
          { fromUserId, toUserId },
        );
      });
    },
  });
}
