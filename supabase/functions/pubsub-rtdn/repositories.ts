import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { getSubscriptionPurchaseAsync } from "../verify-purchase/googlePlayClient.ts";
import type { RtdnDeps } from "./types.ts";

export function createRtdnDeps(adminClient: SupabaseClient): RtdnDeps {
  return {
    findReceiptByToken: async (token) => {
      const { data, error } = await adminClient
        .from("purchase_receipts")
        .select("user_id, provider")
        .eq("purchase_token", token)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    getSubscriptionStatus: async (pkg, token) => {
      const r = await getSubscriptionPurchaseAsync(pkg, token);
      return { subscriptionState: r.subscriptionState, lineItems: r.lineItems };
    },
    updateEntitlement: async (row) => {
      const { error } = await adminClient
        .from("entitlements")
        .upsert(row, { onConflict: "user_id,bundle_id,provider" });
      if (error) throw error;
    },
    updateReceiptStatus: async (token, status) => {
      const { error } = await adminClient
        .from("purchase_receipts")
        .update({ status })
        .eq("purchase_token", token);
      if (error) throw error;
    },
    revokeEntitlementsByProviderRef: async (token) => {
      const { error } = await adminClient
        .from("entitlements")
        .update({ status: "revoked", auto_renewing: false })
        .eq("provider_ref", token);
      if (error) throw error;
    },
  };
}
