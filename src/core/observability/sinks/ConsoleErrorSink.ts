import type { ErrorReport, ErrorSink } from "@/src/core/observability/types";

export class ConsoleErrorSink implements ErrorSink {
  async report(report: ErrorReport): Promise<void> {
    console.error(JSON.stringify(report, null, 2));
  }
}
