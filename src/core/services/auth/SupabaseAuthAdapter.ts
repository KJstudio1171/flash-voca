import type { SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseAuthClient } from "@/src/core/services/auth/SupabaseAuthService";

export class SupabaseAuthAdapter implements SupabaseAuthClient {
  constructor(private readonly client: SupabaseClient) {}

  async getCurrentSessionAsync() {
    const { data } = await this.client.auth.getSession();
    const session = data.session;
    if (!session) return null;
    return {
      userId: session.user.id,
      email: session.user.email ?? null,
    };
  }

  async signInAnonymouslyAsync() {
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error || !data.user) {
      throw error ?? new Error("Anonymous sign-in returned no user");
    }
    return { userId: data.user.id, email: null };
  }

  async signInWithGoogleIdTokenAsync(idToken: string) {
    const { data, error } = await this.client.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error || !data.user) {
      throw error ?? new Error("Google sign-in returned no user");
    }
    return {
      userId: data.user.id,
      email: data.user.email ?? null,
    };
  }
}
