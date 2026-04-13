import type {
  AnalyticsEvent,
  AnalyticsSink,
  ErrorReport,
  ErrorSink,
} from "@/src/core/observability/types";

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

export class FakeAnalyticsSink implements AnalyticsSink {
  readonly received: AnalyticsEvent[] = [];
  async track(event: AnalyticsEvent): Promise<void> {
    this.received.push(event);
  }
}

export class ThrowingAnalyticsSink implements AnalyticsSink {
  async track(): Promise<void> {
    throw new Error("sink failed");
  }
}
