import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n/types";

export class UnknownError extends AppError {
  readonly category = "unknown";
  readonly messageKey: TranslationKey = "errors.unknown";
  constructor(options?: AppErrorOptions) {
    super("Unknown error", options);
  }
}
