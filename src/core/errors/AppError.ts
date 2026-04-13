import { i18next } from "@/src/shared/i18n";
import type { TranslationKey } from "@/src/shared/i18n";

export type AppErrorOptions = {
  context?: Record<string, unknown>;
  cause?: unknown;
  messageParams?: Record<string, string | number>;
};

export abstract class AppError extends Error {
  abstract readonly category: string;
  abstract readonly messageKey: TranslationKey;
  readonly messageParams?: Record<string, string | number>;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.context = options?.context;
    this.messageParams = options?.messageParams;
    this.timestamp = new Date().toISOString();
  }

  get userMessage(): string {
    return i18next.t(this.messageKey, this.messageParams ?? {}) as string;
  }
}
