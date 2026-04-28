import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { GoogleLinkError } from "@/src/core/errors";

export interface GoogleSignInClient {
  configure(webClientId: string): void;
  fetchIdTokenAsync(): Promise<string>;
}

export class RealGoogleSignInClient implements GoogleSignInClient {
  configure(webClientId: string) {
    GoogleSignin.configure({ webClientId });
  }

  async fetchIdTokenAsync() {
    try {
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
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        throw new GoogleLinkError({ context: { reason: "cancelled" }, cause });
      }
      throw new GoogleLinkError({ context: { reason: "unknown" }, cause });
    }
  }
}
