import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n/types";

export abstract class BillingError extends AppError {
  readonly category = "billing";
}

export class BillingInitError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.init";
  constructor(options?: AppErrorOptions) {
    super("Billing initialization failed", options);
  }
}

export class BillingProductMissingError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.productMissing";
  constructor(options?: AppErrorOptions) {
    super("Bundle is missing a Play product mapping", options);
  }
}

export class BillingPurchaseCancelledError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.purchaseFailed";
  constructor(options?: AppErrorOptions) {
    super("User cancelled purchase", options);
  }
}

export class BillingPurchaseFailedError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.purchaseFailed";
  constructor(options?: AppErrorOptions) {
    super("Play purchase failed", options);
  }
}

export class BillingVerificationError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.verificationFailed";
  constructor(options?: AppErrorOptions) {
    super("Receipt verification failed", options);
  }
}

export class AuthGateCancelledError extends BillingError {
  readonly messageKey: TranslationKey = "errors.billing.purchaseFailed";
  constructor(options?: AppErrorOptions) {
    super("User cancelled the auth gate", options);
  }
}
