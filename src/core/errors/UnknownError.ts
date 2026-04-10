import { AppError, AppErrorOptions } from "@/src/core/errors/AppError";

export class UnknownError extends AppError {
  readonly category = "unknown";
  readonly userMessage = "알 수 없는 오류가 발생했습니다.";
  constructor(options?: AppErrorOptions) {
    super("Unknown error", options);
  }
}
