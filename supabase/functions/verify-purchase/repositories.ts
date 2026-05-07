import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import {
  getProductPurchaseAsync,
  getSubscriptionPurchaseAsync,
} from "./googlePlayClient.ts";
import type { VerifyDeps } from "./verifier.ts";

export function createVerifyDeps(adminClient: SupabaseClient): VerifyDeps {
  return {
    findBundleById: async (id) => {
      const { data } = await adminClient
        .from("bundles")
        .select("play_product_id")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    findBundleByProductId: async (pid) => {
      const { data } = await adminClient
        .from("bundles")
        .select("id")
        .eq("play_product_id", pid)
        .maybeSingle();
      return data;
    },
    findReceiptByToken: async (token) => {
      const { data } = await adminClient
        .from("purchase_receipts")
        .select("user_id, status")
        .eq("purchase_token", token)
        .maybeSingle();
      return data;
    },
    upsertReceipt: async (row) => {
      const { error } = await adminClient
        .from("purchase_receipts")
        .upsert(row, { onConflict: "purchase_token" });
      if (error) throw error;
    },
    upsertEntitlement: async (row) => {
      const { data, error } = await adminClient
        .from("entitlements")
        .upsert(
          {
            user_id: row.user_id,
            bundle_id: row.bundle_id,
            provider: row.provider,
            provider_ref: row.provider_ref,
            kind: row.kind,
            expires_at: row.expires_at,
            auto_renewing: row.auto_renewing,
            status: "active",
            granted_at: new Date().toISOString(),
          },
          { onConflict: "user_id,bundle_id,provider" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    getPlayPurchaseStatus: getProductPurchaseAsync,
    getSubscriptionStatus: getSubscriptionPurchaseAsync,
  };
}
