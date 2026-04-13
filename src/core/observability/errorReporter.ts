import type { AppError } from "@/src/core/errors";
import type { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import type { ConsentStore } from "@/src/core/observability/consent";
import type { ContextEnricher } from "@/src/core/observability/contextEnricher";
import { scrubErrorContext } from "@/src/core/observability/scrub";
import type { ErrorReport, ErrorSink } from "@/src/core/observability/types";

export class ErrorReporter {
  constructor(
    private readonly sink: ErrorSink,
    private readonly enricher: ContextEnricher,
    private readonly breadcrumbs: BreadcrumbBuffer,
    private readonly consent: ConsentStore,
  ) {}

  async report(appError: AppError, userId?: string): Promise<void> {
    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
    if (!isDev) {
      const consent = await this.consent.load();
      if (!consent.errorReports) return;
    }

    const report: ErrorReport = {
      name: appError.name,
      category: appError.category,
      message: appError.message,
      userMessage: appError.userMessage,
      timestamp: appError.timestamp,
      context: scrubErrorContext(appError.context),
      stack: appError.stack,
      cause: extractCauseInfo(appError.cause),
      breadcrumbs: this.breadcrumbs.snapshot(),
      observability: this.enricher.build(userId),
    };

    try {
      await this.sink.report(report);
    } catch {
      // swallow — recursive reporting would loop
    }
  }
}

function extractCauseInfo(
  cause: unknown,
): { name: string; message: string } | undefined {
  if (cause instanceof Error) return { name: cause.name, message: cause.message };
  return undefined;
}
