import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n/types";

export abstract class AuthError extends AppError {
  readonly category = "auth";
}

export class AuthBootstrapError extends AuthError {
  readonly messageKey: TranslationKey = "errors.auth.bootstrap";
  constructor(options?: AppErrorOptions) {
    super("Auth bootstrap failed", options);
  }
}

export class GoogleLinkError extends AuthError {
  readonly messageKey: TranslationKey = "errors.auth.googleLink";
  constructor(options?: AppErrorOptions) {
    super("Google link failed", options);
  }
}

export class IdentityConflictError extends AuthError {
  readonly messageKey: TranslationKey = "errors.auth.identityConflict";
  constructor(options?: AppErrorOptions) {
    super("Identity already linked to another user", options);
  }
}

export class MigrationError extends AuthError {
  readonly messageKey: TranslationKey = "errors.auth.migration";
  constructor(options?: AppErrorOptions) {
    super("Auth migration failed", options);
  }
}
