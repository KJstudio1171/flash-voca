import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n";

export abstract class NetworkError extends AppError {
  readonly category = "network";
}

export class SyncError extends NetworkError {
  readonly messageKey: TranslationKey = "errors.sync";
  constructor(options?: AppErrorOptions) {
    super("Sync failed", options);
  }
}

export class EntitlementFetchError extends NetworkError {
  readonly messageKey: TranslationKey = "errors.entitlementFetch";
  constructor(options?: AppErrorOptions) {
    super("Entitlement fetch failed", options);
  }
}
