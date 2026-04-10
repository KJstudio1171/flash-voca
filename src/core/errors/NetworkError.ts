import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";

export abstract class NetworkError extends AppError {
  readonly category = "network";
}

export class SyncError extends NetworkError {
  readonly userMessage = "동기화에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Sync failed", options);
  }
}

export class EntitlementFetchError extends NetworkError {
  readonly userMessage = "구매 정보를 불러올 수 없습니다.";
  constructor(options?: AppErrorOptions) {
    super("Entitlement fetch failed", options);
  }
}
