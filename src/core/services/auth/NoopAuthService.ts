import { randomUUID } from "expo-crypto";

import { GoogleLinkError } from "@/src/core/errors";
import {
  AuthService,
  AuthState,
  AuthStateListener,
} from "@/src/core/services/auth/AuthService";
import { UserIdStorage } from "@/src/core/services/auth/userIdStorage";

export class NoopAuthService implements AuthService {
  private state: AuthState | null = null;
  private listeners = new Set<AuthStateListener>();

  constructor(private readonly storage: UserIdStorage) {}

  async bootstrapAsync() {
    let stored = await this.storage.getStoredUserIdAsync();
    if (!stored) {
      stored = `local-${randomUUID()}`;
      await this.storage.setStoredUserIdAsync(stored);
    }
    this.state = { kind: "local-temp", userId: stored };
  }

  getCurrentUserId() {
    if (!this.state) {
      throw new Error("AuthService not bootstrapped");
    }
    return this.state.userId;
  }

  getState() {
    if (!this.state) {
      throw new Error("AuthService not bootstrapped");
    }
    return this.state;
  }

  async linkGoogleAsync() {
    throw new GoogleLinkError({
      context: { reason: "supabase-not-configured" },
    });
  }

  subscribe(listener: AuthStateListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
