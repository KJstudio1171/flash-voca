import type { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import type { ConsentStore } from "@/src/core/observability/consent";
import type { ContextEnricher } from "@/src/core/observability/contextEnricher";
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "@/src/core/observability/eventRegistry";
import { scrubAnalyticsProperties } from "@/src/core/observability/scrub";
import type {
  AnalyticsEvent,
  AnalyticsSink,
  AnalyticsValue,
} from "@/src/core/observability/types";

export class Analytics {
  constructor(
    private readonly sink: AnalyticsSink,
    private readonly enricher: ContextEnricher,
    private readonly breadcrumbs: BreadcrumbBuffer,
    private readonly consent: ConsentStore,
  ) {}

  async track<N extends AnalyticsEventName>(
    name: N,
    properties?: AnalyticsEventProperties<N>,
  ): Promise<void> {
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      kind: "event",
      name,
      properties: properties as Record<string, AnalyticsValue> | undefined,
    });

    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
    if (!isDev) {
      const consent = await this.consent.load();
      if (!consent.analytics) return;
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      properties: scrubAnalyticsProperties(
        name,
        properties as Record<string, unknown> | undefined,
      ),
      observability: this.enricher.build(),
    };

    try {
      await this.sink.track(event);
    } catch {
      // swallow
    }
  }
}
