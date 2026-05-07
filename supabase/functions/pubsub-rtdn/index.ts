import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { verifyPubSubOIDC } from "./auth.ts";
import {
  handleSubscriptionNotification,
  handleVoidedPurchase,
} from "./notificationHandler.ts";
import { parsePubSubPayload } from "./pubsub.ts";
import { createRtdnDeps } from "./repositories.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }
  if (!(await verifyPubSubOIDC(req))) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await parsePubSubPayload(req);
  if (payload instanceof Response) return payload;

  const deps = createRtdnDeps(adminClient);

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
