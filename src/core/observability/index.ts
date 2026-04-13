// src/core/observability/index.ts
import * as Application from "expo-application";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";

import { Analytics } from "@/src/core/observability/analytics";
import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import { ConsentStore } from "@/src/core/observability/consent";
import { ContextEnricher } from "@/src/core/observability/contextEnricher";
import { ErrorReporter } from "@/src/core/observability/errorReporter";
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "@/src/core/observability/eventRegistry";
import { getOrCreateInstallId } from "@/src/core/observability/installId";
import { SqliteKeyValueStore } from "@/src/core/observability/storage";
import type {
  AnalyticsSink,
  ErrorSink,
} from "@/src/core/observability/types";

export type ObservabilityConfig = {
  errorSink: ErrorSink;
  analyticsSink: AnalyticsSink;
  getLocale: () => string;
};

let errorReporter: ErrorReporter | undefined;
let analytics: Analytics | undefined;

export async function initializeObservability(
  config: ObservabilityConfig,
): Promise<void> {
  const store = new SqliteKeyValueStore();
  const installId = await getOrCreateInstallId(store, () => randomUUID());
  const consent = new ConsentStore(store);
  const breadcrumbs = new BreadcrumbBuffer();
  const platform =
    Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";
  const enricher = new ContextEnricher(
    installId,
    Application.nativeApplicationVersion ?? "unknown",
    platform,
    String(Platform.Version),
    config.getLocale,
    randomUUID(),
  );
  errorReporter = new ErrorReporter(config.errorSink, enricher, breadcrumbs, consent);
  analytics = new Analytics(config.analyticsSink, enricher, breadcrumbs, consent);
}

export function getErrorReporter(): ErrorReporter {
  if (!errorReporter) {
    throw new Error("Observability not initialized. Call initializeObservability first.");
  }
  return errorReporter;
}

export function getAnalytics(): Analytics {
  if (!analytics) {
    throw new Error("Observability not initialized. Call initializeObservability first.");
  }
  return analytics;
}

export function trackSafely<N extends AnalyticsEventName>(
  name: N,
  properties?: AnalyticsEventProperties<N>,
): void {
  if (!analytics) return;
  void analytics.track(name, properties);
}

export function resetObservabilityForTests(): void {
  errorReporter = undefined;
  analytics = undefined;
}

export type { ErrorSink, AnalyticsSink } from "@/src/core/observability/types";
export { ConsoleErrorSink } from "@/src/core/observability/sinks/ConsoleErrorSink";
export { ConsoleAnalyticsSink } from "@/src/core/observability/sinks/ConsoleAnalyticsSink";
export { NoopErrorSink, NoopAnalyticsSink } from "@/src/core/observability/sinks/NoopSink";
