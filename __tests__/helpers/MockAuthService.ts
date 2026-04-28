import type {
  AuthService,
  AuthState,
  AuthStateListener,
} from "@/src/core/services/auth/AuthService";

export const TEST_USER_ID = "test-user-uid";

export function createMockAuthService(
  overrides: Partial<AuthService> = {},
  initialState: AuthState = { kind: "anonymous", userId: TEST_USER_ID },
): AuthService {
  let state = initialState;
  const listeners = new Set<AuthStateListener>();
  return {
    bootstrapAsync: jest.fn().mockResolvedValue(undefined),
    getCurrentUserId: () => state.userId,
    getState: () => state,
    linkGoogleAsync: jest.fn().mockResolvedValue(undefined),
    subscribe: (listener: AuthStateListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ...overrides,
  };
}
