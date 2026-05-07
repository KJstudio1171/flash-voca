import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { requireLinkedUserId } from "./auth.ts";
import { createVerifyDeps } from "./repositories.ts";
import { jsonError, jsonSuccess } from "./response.ts";
import { verifyPurchase, VerifyError } from "./verifier.ts";
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

async function parseRequestBody(req: Request): Promise<VerifyPurchaseRequest | null> {
  try {
    return (await req.json()) as VerifyPurchaseRequest;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method !== "POST") return jsonError(405, "method_not_allowed");

  const userId = await requireLinkedUserId({
    req,
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  });
  if (userId instanceof Response) return userId;

  const body = await parseRequestBody(req);
  if (!body) return jsonError(400, "invalid_request");

  try {
    const result = await verifyPurchase(
      body,
      userId,
      createVerifyDeps(adminClient),
      PACKAGE_NAME,
      PRO_PRODUCT_IDS,
    );
    return jsonSuccess(result);
  } catch (err) {
    if (err instanceof VerifyError) return jsonError(err.status, err.code);
    console.error("verify-purchase error", err);
    return jsonError(500, "verification_failed");
  }
});
