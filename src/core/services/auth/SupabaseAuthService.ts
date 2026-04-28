import { GoogleLinkError, IdentityConflictError } from "@/src/core/errors";
import {
  AuthService,
  AuthState,
  AuthStateListener,
} from "@/src/core/services/auth/AuthService";
import { GoogleSignInClient } from "@/src/core/services/auth/google/GoogleSignInClient";
import { UserIdStorage } from "@/src/core/services/auth/userIdStorage";

const LEGACY_USER_ID = "local-user";

export interface SupabaseAuthClient {
  signInAnonymouslyAsync(): Promise<{ userId: string; email: string | null }>;
  signInWithGoogleIdTokenAsync(
    idToken: string,
  ): Promise<{ userId: string; email: string | null }>;
  getCurrentSessionAsync(): Promise<{ userId: string; email: string | null } | null>;
}

export interface SupabaseAuthDeps {
  storage: UserIdStorage;
  runMigrationInTxAsync(fromUserId: string, toUserId: string): Promise<void>;
  supabase: SupabaseAuthClient;
  google: GoogleSignInClient;
  googleWebClientId: string;
  randomId(): string;
}

export class SupabaseAuthService implements AuthService {
  private state: AuthState | null = null;
  private listeners = new Set<AuthStateListener>();

  constructor(private readonly deps: SupabaseAuthDeps) {}

  async bootstrapAsync() {
    this.deps.google.configure(this.deps.googleWebClientId);

    const session = await this.deps.supabase.getCurrentSessionAsync().catch(() => null);
    let userId = await this.deps.storage.getStoredUserIdAsync();

    if (session) {
      if (!userId || userId !== session.userId) {
        await this.deps.storage.setStoredUserIdAsync(session.userId);
        userId = session.userId;
      }
      this.state = session.email
        ? {
            kind: "linked",
            userId: session.userId,
            provider: "google",
            email: session.email,
          }
        : { kind: "anonymous", userId: session.userId };
      await this.runMigrationIfNeeded(userId);
      return;
    }

    if (!userId) {
      userId = `local-${this.deps.randomId()}`;
      await this.deps.storage.setStoredUserIdAsync(userId);
    }
    this.state = { kind: "local-temp", userId };
    await this.runMigrationIfNeeded(userId);
  }

  private async runMigrationIfNeeded(toUserId: string) {
    if (await this.deps.storage.isMigrationDoneAsync()) return;
    try {
      await this.deps.runMigrationInTxAsync(LEGACY_USER_ID, toUserId);
      await this.deps.storage.markMigrationDoneAsync();
    } catch {
      // dev-stage: log only, retry on next bootstrap
    }
  }

  async rebindAnonymousAsync() {
    if (!this.state || this.state.kind !== "local-temp") return;
    const localTempId = this.state.userId;

    try {
      const result = await this.deps.supabase.signInAnonymouslyAsync();
      await this.deps.runMigrationInTxAsync(localTempId, result.userId);
      await this.deps.storage.setStoredUserIdAsync(result.userId);
      this.transition({ kind: "anonymous", userId: result.userId });
    } catch {
      // keep local-temp; will retry on next bootstrap
    }
  }

  getCurrentUserId() {
    if (!this.state) throw new Error("AuthService not bootstrapped");
    return this.state.userId;
  }

  getState() {
    if (!this.state) throw new Error("AuthService not bootstrapped");
    return this.state;
  }

  async linkGoogleAsync() {
    if (!this.state) throw new Error("AuthService not bootstrapped");

    const idToken = await this.deps.google.fetchIdTokenAsync();
    let result: { userId: string; email: string | null };
    try {
      result = await this.deps.supabase.signInWithGoogleIdTokenAsync(idToken);
    } catch (cause: unknown) {
      const code = (cause as { code?: string })?.code;
      if (code === "identity_already_exists") {
        throw new IdentityConflictError({ cause });
      }
      throw new GoogleLinkError({ cause });
    }

    await this.deps.storage.setStoredUserIdAsync(result.userId);
    this.transition({
      kind: "linked",
      userId: result.userId,
      provider: "google",
      email: result.email,
    });
  }

  subscribe(listener: AuthStateListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private transition(state: AuthState) {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
