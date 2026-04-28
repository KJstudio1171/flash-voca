import {
  SupabaseAuthService,
  SupabaseAuthDeps,
} from "@/src/core/services/auth/SupabaseAuthService";
import { GoogleLinkError, IdentityConflictError } from "@/src/core/errors";

function createDeps(overrides: Partial<SupabaseAuthDeps> = {}): SupabaseAuthDeps {
  const stored: { value: string | null; migrationDone: boolean } = {
    value: null,
    migrationDone: false,
  };
  return {
    storage: {
      getStoredUserIdAsync: jest.fn(async () => stored.value),
      setStoredUserIdAsync: jest.fn(async (v: string) => {
        stored.value = v;
      }),
      isMigrationDoneAsync: jest.fn(async () => stored.migrationDone),
      markMigrationDoneAsync: jest.fn(async () => {
        stored.migrationDone = true;
      }),
    },
    runMigrationInTxAsync: jest.fn(async (_fromUserId, _toUserId) => {}),
    supabase: {
      signInAnonymouslyAsync: jest.fn(async () => ({ userId: "anon-uid", email: null })),
      signInWithGoogleIdTokenAsync: jest.fn(async () => ({
        userId: "google-uid",
        email: "u@example.com",
      })),
      getCurrentSessionAsync: jest.fn(async () => null),
    },
    google: {
      configure: jest.fn(),
      fetchIdTokenAsync: jest.fn(async () => "id-token"),
    },
    googleWebClientId: "client-id",
    randomId: () => "rand-uuid",
    ...overrides,
  };
}

describe("SupabaseAuthService.bootstrapAsync", () => {
  it("creates a local-temp uid on first run and migrates LOCAL_USER_ID rows", async () => {
    const deps = createDeps();
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();

    expect(deps.storage.setStoredUserIdAsync).toHaveBeenCalledWith("local-rand-uuid");
    expect(deps.runMigrationInTxAsync).toHaveBeenCalledWith("local-user", "local-rand-uuid");
    expect(deps.storage.markMigrationDoneAsync).toHaveBeenCalled();
    expect(svc.getCurrentUserId()).toBe("local-rand-uuid");
    expect(svc.getState().kind).toBe("local-temp");
  });

  it("reuses stored uid on subsequent runs and skips migration", async () => {
    const deps = createDeps();
    (deps.storage.getStoredUserIdAsync as jest.Mock).mockResolvedValue("local-existing");
    (deps.storage.isMigrationDoneAsync as jest.Mock).mockResolvedValue(true);
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();

    expect(svc.getCurrentUserId()).toBe("local-existing");
    expect(deps.runMigrationInTxAsync).not.toHaveBeenCalled();
  });

  it("throws if getCurrentUserId is called before bootstrap", () => {
    const deps = createDeps();
    const svc = new SupabaseAuthService(deps);
    expect(() => svc.getCurrentUserId()).toThrow();
  });
});

describe("SupabaseAuthService rebind", () => {
  it("rebinds local-temp to anonymous uid in a single migration call", async () => {
    const deps = createDeps();
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();

    await svc.rebindAnonymousAsync();

    expect(deps.supabase.signInAnonymouslyAsync).toHaveBeenCalled();
    expect(deps.runMigrationInTxAsync).toHaveBeenLastCalledWith(
      "local-rand-uuid",
      "anon-uid",
    );
    expect(svc.getCurrentUserId()).toBe("anon-uid");
    expect(svc.getState().kind).toBe("anonymous");
  });

  it("keeps local-temp uid when anonymous sign-in fails", async () => {
    const deps = createDeps();
    (deps.supabase.signInAnonymouslyAsync as jest.Mock).mockRejectedValue(new Error("net"));
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();

    await svc.rebindAnonymousAsync();

    expect(svc.getCurrentUserId()).toBe("local-rand-uuid");
    expect(svc.getState().kind).toBe("local-temp");
  });
});

describe("SupabaseAuthService.linkGoogleAsync", () => {
  it("transitions to linked state and notifies subscribers", async () => {
    const deps = createDeps();
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();
    await svc.rebindAnonymousAsync();

    const listener = jest.fn();
    svc.subscribe(listener);

    await svc.linkGoogleAsync();

    expect(svc.getState()).toEqual({
      kind: "linked",
      userId: "google-uid",
      provider: "google",
      email: "u@example.com",
    });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ kind: "linked" }));
  });

  it("maps identity conflict response to IdentityConflictError", async () => {
    const deps = createDeps();
    (deps.supabase.signInWithGoogleIdTokenAsync as jest.Mock).mockRejectedValue({
      code: "identity_already_exists",
    });
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();
    await svc.rebindAnonymousAsync();

    await expect(svc.linkGoogleAsync()).rejects.toBeInstanceOf(IdentityConflictError);
  });

  it("wraps cancellations as GoogleLinkError", async () => {
    const deps = createDeps();
    (deps.google.fetchIdTokenAsync as jest.Mock).mockRejectedValue(
      new GoogleLinkError({ context: { reason: "cancelled" } }),
    );
    const svc = new SupabaseAuthService(deps);
    await svc.bootstrapAsync();

    await expect(svc.linkGoogleAsync()).rejects.toBeInstanceOf(GoogleLinkError);
  });
});
