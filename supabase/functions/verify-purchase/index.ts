import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { verifyPurchase, VerifyError, VerifyDeps } from "./verifier.ts";
import {
  getProductPurchaseAsync,
  getSubscriptionPurchaseAsync,
} from "./googlePlayClient.ts";
import type { VerifyPurchaseRequest } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const PACKAGE_NAME = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "";
const PRO_PRODUCT_IDS = {
  monthly: Deno.env.get("PRO_PRODUCT_MONTHLY") ?? "",
  yearly: Deno.env.get("PRO_PRODUCT_YEARLY") ?? "",
  lifetime: Deno.env.get("PRO_PRODUCT_LIFETIME") ?? "",
};

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function jsonError(status: number, code: string) {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") return jsonError(405, "method_not_allowed");

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonError(401, "unauthenticated");
  }
  const jwt = authHeader.slice("Bearer ".length);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData.user) return jsonError(401, "unauthenticated");

  const isAnonymous = (userData.user as unknown as { is_anonymous?: boolean }).is_anonymous;
  const provider = userData.user.app_metadata?.provider;
  const linked = !isAnonymous && provider && provider !== "anonymous";
  if (!linked) return jsonError(401, "not_linked");

  const userId = userData.user.id;
  let body: VerifyPurchaseRequest;
  try {
    body = (await req.json()) as VerifyPurchaseRequest;
  } catch {
    return jsonError(400, "invalid_request");
  }

  const deps: VerifyDeps = {
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

  try {
    const result = await verifyPurchase(body, userId, deps, PACKAGE_NAME, PRO_PRODUCT_IDS);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof VerifyError) return jsonError(err.status, err.code);
    console.error("verify-purchase error", err);
    return jsonError(500, "verification_failed");
  }
});
