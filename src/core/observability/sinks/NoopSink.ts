import type {
  AnalyticsEvent,
  AnalyticsSink,
  ErrorReport,
  ErrorSink,
} from "@/src/core/observability/types";

export class NoopErrorSink implements ErrorSink {
  async report(_report: ErrorReport): Promise<void> {
    // no-op
  }
}

export class NoopAnalyticsSink implements AnalyticsSink {
  async track(_event: AnalyticsEvent): Promise<void> {
    // no-op
  }
}
