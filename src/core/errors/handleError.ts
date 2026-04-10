import { AppError } from "@/src/core/errors/AppError";
import { UnknownError } from "@/src/core/errors/UnknownError";
import { logger } from "@/src/core/errors/logger";

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new UnknownError({ context: { originalMessage: error.message }, cause: error });
  }
  return new UnknownError({ context: { rawValue: String(error) } });
}

type ToastSink = {
  show(message: string): void;
};

export function createErrorHandler(toast: ToastSink) {
  return function handleError(error: unknown): void {
    const appError = normalizeError(error);
    logger.error(appError);
    toast.show(appError.userMessage);
  };
}
