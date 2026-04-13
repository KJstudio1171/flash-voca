import tracking from "promise/setimmediate/rejection-tracking";

import { normalizeError } from "@/src/core/errors/handleError";
import type { ErrorReporter } from "@/src/core/observability/errorReporter";

type ErrorUtilsLike = {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
};

declare const ErrorUtils: ErrorUtilsLike;

export function installGlobalErrorHandler(reporter: ErrorReporter): void {
  if (typeof ErrorUtils !== "undefined") {
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      void reporter.report(normalizeError(error));
      prev(error, isFatal);
    });
  }

  tracking.enable({
    allRejections: true,
    onUnhandled: (_id: number, error: unknown) => {
      void reporter.report(normalizeError(error));
    },
    onHandled: () => {},
  });
}
