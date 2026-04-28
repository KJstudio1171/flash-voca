export { AppError } from "@/src/core/errors/AppError";
export type { AppErrorOptions } from "@/src/core/errors/AppError";
export {
  DatabaseError,
  DeckSaveError,
  DeckDeleteError,
  DeckNotFoundError,
  StudyRecordError,
  BootstrapError,
  BundleQueryError,
  EntitlementCacheError,
} from "@/src/core/errors/DatabaseError";
export { NetworkError, SyncError, EntitlementFetchError } from "@/src/core/errors/NetworkError";
export { UnknownError } from "@/src/core/errors/UnknownError";
export { logger } from "@/src/core/errors/logger";
export {
  AuthError,
  AuthBootstrapError,
  GoogleLinkError,
  IdentityConflictError,
  MigrationError,
} from "@/src/core/errors/AuthError";
export { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";
export {
  BillingError,
  BillingInitError,
  BillingProductMissingError,
  BillingPurchaseCancelledError,
  BillingPurchaseFailedError,
  BillingVerificationError,
  AuthGateCancelledError,
} from "@/src/core/errors/BillingError";
