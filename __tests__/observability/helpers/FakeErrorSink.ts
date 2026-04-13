import type { ErrorReport, ErrorSink } from "@/src/core/observability/types";

export class FakeErrorSink implements ErrorSink {
  readonly received: ErrorReport[] = [];
  async report(report: ErrorReport): Promise<void> {
    this.received.push(report);
  }
}

export class ThrowingErrorSink implements ErrorSink {
  async report(): Promise<void> {
    throw new Error("sink failed");
  }
}
