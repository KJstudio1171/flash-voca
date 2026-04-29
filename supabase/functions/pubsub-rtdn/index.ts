import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import {
  handleSubscriptionNotification,
  handleVoidedPurchase,
} from "./notificationHandler.ts";
import type { RtdnDeps, RtdnPayload } from "./types.ts";
import { getSubscriptionPurchaseAsync } from "../verify-purchase/googlePlayClient.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyPubSubOIDC(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length);
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return false;
    const info = (await res.json()) as { aud?: string; email?: string };
    return Boolean(info.email);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }
  if (!(await verifyPubSubOIDC(req))) {
    return new Response("unauthorized", { status: 401 });
  }

  let pubsubMessage: { message?: { data?: string } };
  try {
    pubsubMessage = await req.json();
  } catch {
    return new Response("invalid_request", { status: 400 });
  }

  const data = pubsubMessage.message?.data;
  if (!data) return new Response("", { status: 204 });

  let payload: RtdnPayload;
  try {
    payload = JSON.parse(atob(data)) as RtdnPayload;
  } catch {
    return new Response("invalid_payload", { status: 400 });
  }

  const deps: RtdnDeps = {
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

  try {
    if (payload.subscriptionNotification) {
      await handleSubscriptionNotification(payload, deps);
    } else if (payload.voidedPurchaseNotification) {
      await handleVoidedPurchase(payload, deps);
    }
    return new Response("", { status: 204 });
  } catch (err) {
    console.error("pubsub-rtdn handler error", err);
    return new Response("error", { status: 500 });
  }
});
