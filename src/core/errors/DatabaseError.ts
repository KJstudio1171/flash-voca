import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";
import type { TranslationKey } from "@/src/shared/i18n";

export abstract class DatabaseError extends AppError {
  readonly category = "database";
}

export class DeckSaveError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.deckSave";
  constructor(options?: AppErrorOptions) {
    super("Deck save failed", options);
  }
}

export class DeckDeleteError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.deckDelete";
  constructor(options?: AppErrorOptions) {
    super("Deck delete failed", options);
  }
}

export class DeckNotFoundError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.deckNotFound";
  constructor(options?: AppErrorOptions) {
    super("Deck not found", options);
  }
}

export class StudyRecordError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.studyRecord";
  constructor(options?: AppErrorOptions) {
    super("Study record save failed", options);
  }
}

export class BootstrapError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.bootstrap";
  constructor(options?: AppErrorOptions) {
    super("App bootstrap failed", options);
  }
}

export class BundleQueryError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.bundleQuery";
  constructor(options?: AppErrorOptions) {
    super("Bundle query failed", options);
  }
}

export class EntitlementCacheError extends DatabaseError {
  readonly messageKey: TranslationKey = "errors.entitlementCache";
  constructor(options?: AppErrorOptions) {
    super("Entitlement cache operation failed", options);
  }
}
