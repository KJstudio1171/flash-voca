export type AuthStateLocalTemp = { kind: "local-temp"; userId: string };
export type AuthStateAnonymous = { kind: "anonymous"; userId: string };
export type AuthStateLinked = {
  kind: "linked";
  userId: string;
  provider: "google";
  email: string | null;
};

export type AuthState = AuthStateLocalTemp | AuthStateAnonymous | AuthStateLinked;

export type AuthStateListener = (state: AuthState) => void;

export interface AuthService {
  bootstrapAsync(): Promise<void>;
  getCurrentUserId(): string;
  getState(): AuthState;
  linkGoogleAsync(): Promise<void>;
  subscribe(listener: AuthStateListener): () => void;
}
