import { SupabaseClient, createClient } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabaseConfig } from "@/src/core/supabase/config";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!hasSupabaseConfig) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}
