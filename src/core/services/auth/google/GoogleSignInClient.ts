import { GoogleLinkError } from "@/src/core/errors";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");
const GOOGLE_SIGN_IN_CANCELLED = "SIGN_IN_CANCELLED";

declare const require: (moduleName: string) => unknown;

export interface GoogleSignInClient {
  configure(webClientId: string): void;
  fetchIdTokenAsync(): Promise<string>;
}

export class RealGoogleSignInClient implements GoogleSignInClient {
  private googleModule: GoogleSignInModule | null = null;
  private webClientId: string | null = null;

  configure(webClientId: string) {
    this.webClientId = webClientId;
  }

  async fetchIdTokenAsync() {
    try {
      const { GoogleSignin } = this.getGoogleModule();
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const result = await GoogleSignin.signIn();
      if (result.type === "cancelled") {
        throw new GoogleLinkError({
          context: { reason: "cancelled" },
        });
      }
      const idToken = result.data?.idToken ?? null;
      if (!idToken) {
        throw new GoogleLinkError({ context: { reason: "no_id_token" } });
      }
      return idToken;
    } catch (cause: unknown) {
      // If already a GoogleLinkError, re-throw as-is
      if (cause instanceof GoogleLinkError) {
        throw cause;
      }
      const code = (cause as { code?: string })?.code;
      if (code === GOOGLE_SIGN_IN_CANCELLED) {
        throw new GoogleLinkError({ context: { reason: "cancelled" }, cause });
      }
      throw new GoogleLinkError({ context: { reason: "unknown" }, cause });
    }
  }

  private getGoogleModule() {
    if (this.googleModule) return this.googleModule;

    try {
      const googleModule = require(
        "@react-native-google-signin/google-signin",
      ) as GoogleSignInModule;
      if (this.webClientId) {
        googleModule.GoogleSignin.configure({ webClientId: this.webClientId });
      }
      this.googleModule = googleModule;
      return googleModule;
    } catch (cause: unknown) {
      throw new GoogleLinkError({
        context: { reason: "native-module-unavailable" },
        cause,
      });
    }
  }
}
