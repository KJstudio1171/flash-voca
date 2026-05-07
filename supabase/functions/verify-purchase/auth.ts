import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { jsonError } from "./response.ts";

export async function requireLinkedUserId(input: {
  req: Request;
  supabaseUrl: string;
  supabaseAnonKey: string;
}): Promise<string | Response> {
  const authHeader = input.req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonError(401, "unauthenticated");
  }
  const jwt = authHeader.slice("Bearer ".length);

  const userClient = createClient(input.supabaseUrl, input.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData.user) return jsonError(401, "unauthenticated");

  const isAnonymous = (userData.user as unknown as { is_anonymous?: boolean })
    .is_anonymous;
  const provider = userData.user.app_metadata?.provider;
  const linked = !isAnonymous && provider && provider !== "anonymous";
  if (!linked) return jsonError(401, "not_linked");

  return userData.user.id;
}
