import { getDatabaseAsync } from "@/src/core/database/client";
import { Entitlement } from "@/src/core/domain/models";

export class SqliteEntitlementRepository {
  async listActiveEntitlementsAsync(userId: string) {
    const db = await getDatabaseAsync();

    return db.getAllAsync<Entitlement>(
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
  }

  async hasBundleAccessAsync(bundleId: string, userId: string) {
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
  }

  async replaceCachedEntitlementsAsync(userId: string, entitlements: Entitlement[]) {
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
  }

  async clearCachedEntitlementsAsync(userId: string) {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM cached_entitlements WHERE user_id = ?;", [userId]);
  }
}
