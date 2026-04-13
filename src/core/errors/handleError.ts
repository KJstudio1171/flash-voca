import { AppError } from "@/src/core/errors/AppError";
import { UnknownError } from "@/src/core/errors/UnknownError";

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new UnknownError({ context: { originalMessage: error.message }, cause: error });
  }
  return new UnknownError({ context: { rawValue: String(error) } });
}

type ToastSink = {
  show(message: string): void;
};

type ReporterLike = {
  report(error: AppError): Promise<void>;
};

export function createErrorHandler(toast: ToastSink, reporter: ReporterLike) {
  return function handleError(error: unknown): void {
    const appError = normalizeError(error);
    void reporter.report(appError);
    toast.show(appError.userMessage);
  };
}
