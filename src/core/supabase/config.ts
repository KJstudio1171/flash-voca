export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const hasSupabaseConfig =
  supabaseConfig.url.length > 0 && supabaseConfig.anonKey.length > 0;
