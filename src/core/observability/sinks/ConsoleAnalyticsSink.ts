import type { AnalyticsEvent, AnalyticsSink } from "@/src/core/observability/types";

export class ConsoleAnalyticsSink implements AnalyticsSink {
  async track(event: AnalyticsEvent): Promise<void> {
    console.info(JSON.stringify(event, null, 2));
  }
}
