import { RemoteEntitlementGateway } from "@/src/core/repositories/contracts/RemoteEntitlementGateway";
import { getSupabaseClient } from "@/src/core/supabase/client";

export class SupabaseEntitlementGateway implements RemoteEntitlementGateway {
  async pullEntitlementsAsync(userId: string) {
    const client = getSupabaseClient();

    if (!client) {
      return [];
    }

    const { data, error } = await client
      .from("entitlements")
      .select(
        "id, user_id, bundle_id, provider, provider_ref, status, granted_at, expires_at, synced_at",
      )
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      bundleId: row.bundle_id,
      provider: row.provider,
      providerRef: row.provider_ref,
      status: row.status,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      syncedAt: row.synced_at,
    }));
  }
}
