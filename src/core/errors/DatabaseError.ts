import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";

export abstract class DatabaseError extends AppError {
  readonly category = "database";
}

export class DeckSaveError extends DatabaseError {
  readonly userMessage = "덱 저장에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Deck save failed", options);
  }
}

export class DeckDeleteError extends DatabaseError {
  readonly userMessage = "덱 삭제에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Deck delete failed", options);
  }
}

export class DeckNotFoundError extends DatabaseError {
  readonly userMessage = "덱을 찾을 수 없습니다.";
  constructor(options?: AppErrorOptions) {
    super("Deck not found", options);
  }
}

export class StudyRecordError extends DatabaseError {
  readonly userMessage = "학습 기록 저장에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Study record save failed", options);
  }
}

export class BootstrapError extends DatabaseError {
  readonly userMessage = "앱 초기화에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("App bootstrap failed", options);
  }
}

export class BundleQueryError extends DatabaseError {
  readonly userMessage = "번들 정보를 불러올 수 없습니다.";
  constructor(options?: AppErrorOptions) {
    super("Bundle query failed", options);
  }
}

export class EntitlementCacheError extends DatabaseError {
  readonly userMessage = "구매 캐시 처리에 실패했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Entitlement cache operation failed", options);
  }
}
