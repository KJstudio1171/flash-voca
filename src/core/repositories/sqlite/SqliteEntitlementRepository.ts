import { getDatabaseAsync } from "@/src/core/database/client";
import { Entitlement } from "@/src/core/domain/models";
import { EntitlementCacheError } from "@/src/core/errors";

export class SqliteEntitlementRepository {
  async listActiveEntitlementsAsync(userId: string) {
    try {
      const db = await getDatabaseAsync();

      const rows = await db.getAllAsync<{
        id: string;
        userId: string;
        bundleId: string;
        provider: string;
        providerRef: string | null;
        status: string;
        grantedAt: string;
        expiresAt: string | null;
        syncedAt: string | null;
        kind: string;
        auto_renewing: number;
      }>(
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
            synced_at as syncedAt,
            kind,
            auto_renewing
          FROM cached_entitlements
          WHERE user_id = ?
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > ?)
          ORDER BY granted_at DESC;
        `,
        [userId, new Date().toISOString()],
      );
      return rows.map((row) => ({
        ...row,
        status: row.status as Entitlement["status"],
        kind: (row.kind === "subscription" ? "subscription" : "one_time") as Entitlement["kind"],
        autoRenewing: Boolean(row.auto_renewing),
      }));
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
                id, user_id, bundle_id, provider, provider_ref, status, granted_at, expires_at, synced_at, kind, auto_renewing, cache_updated_at, raw_payload
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
              entitlement.kind,
              entitlement.autoRenewing ? 1 : 0,
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

  async upsertCachedEntitlementAsync(entitlement: Entitlement): Promise<void> {
    try {
      const db = await getDatabaseAsync();
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO cached_entitlements (
          id, user_id, bundle_id, provider, provider_ref, status,
          granted_at, expires_at, synced_at, kind, auto_renewing, cache_updated_at, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          provider_ref = excluded.provider_ref,
          granted_at = excluded.granted_at,
          expires_at = excluded.expires_at,
          synced_at = excluded.synced_at,
          kind = excluded.kind,
          auto_renewing = excluded.auto_renewing,
          cache_updated_at = excluded.cache_updated_at;`,
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
          entitlement.kind,
          entitlement.autoRenewing ? 1 : 0,
          now,
        ],
      );
    } catch (error) {
      if (error instanceof EntitlementCacheError) {
        throw error;
      }
      throw new EntitlementCacheError({ context: { entitlementId: entitlement.id }, cause: error });
    }
  }
}
