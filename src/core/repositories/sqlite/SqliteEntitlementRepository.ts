import { getDatabaseAsync } from "@/src/core/database/client";
import { Entitlement } from "@/src/core/domain/models";
import { EntitlementCacheError } from "@/src/core/errors";

export class SqliteEntitlementRepository {
  async listActiveEntitlementsAsync(userId: string) {
    try {
      const db = await getDatabaseAsync();

      return await db.getAllAsync<Entitlement>(
        `
          SELECT
            id,
            user_id as userId,
            bundle_id as bundleId,
            provider,
            provider_ref as providerRef,
            status,
            granted_at as grantedAt,
            expires_at as expiresAt,
            synced_at as syncedAt
          FROM cached_entitlements
          WHERE user_id = ?
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > ?)
          ORDER BY granted_at DESC;
        `,
        [userId, new Date().toISOString()],
      );
    } catch (error) {
      if (error instanceof EntitlementCacheError) {
        throw error;
      }
      throw new EntitlementCacheError({ context: { userId }, cause: error });
    }
  }

  async hasBundleAccessAsync(bundleId: string, userId: string) {
    try {
      const db = await getDatabaseAsync();
      const row = await db.getFirstAsync<{ count: number }>(
        `
          SELECT COUNT(*) as count
          FROM cached_entitlements
          WHERE bundle_id = ?
            AND user_id = ?
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > ?);
        `,
        [bundleId, userId, new Date().toISOString()],
      );

      return Number(row?.count ?? 0) > 0;
    } catch (error) {
      if (error instanceof EntitlementCacheError) {
        throw error;
      }
      throw new EntitlementCacheError({ context: { bundleId, userId }, cause: error });
    }
  }

  async replaceCachedEntitlementsAsync(userId: string, entitlements: Entitlement[]) {
    try {
      const db = await getDatabaseAsync();

      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync("DELETE FROM cached_entitlements WHERE user_id = ?;", [userId]);

        for (const entitlement of entitlements) {
          await tx.runAsync(
            `
              INSERT INTO cached_entitlements (
                id, user_id, bundle_id, provider, provider_ref, status, granted_at, expires_at, synced_at, cache_updated_at, raw_payload
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `,
            [
              entitlement.id,
              entitlement.userId,
              entitlement.bundleId,
              entitlement.provider,
              entitlement.providerRef,
              entitlement.status,
              entitlement.grantedAt,
              entitlement.expiresAt,
              entitlement.syncedAt,
              new Date().toISOString(),
              JSON.stringify(entitlement),
            ],
          );
        }
      });
    } catch (error) {
      if (error instanceof EntitlementCacheError) {
        throw error;
      }
      throw new EntitlementCacheError({ context: { userId }, cause: error });
    }
  }

  async clearCachedEntitlementsAsync(userId: string) {
    try {
      const db = await getDatabaseAsync();
      await db.runAsync("DELETE FROM cached_entitlements WHERE user_id = ?;", [userId]);
    } catch (error) {
      if (error instanceof EntitlementCacheError) {
        throw error;
      }
      throw new EntitlementCacheError({ context: { userId }, cause: error });
    }
  }
}
