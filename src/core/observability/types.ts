import type { AnalyticsEventName } from "@/src/core/observability/eventRegistry";

export type ObservabilityContext = {
  installId: string;
  appVersion: string;
  platform: "android" | "ios" | "web";
  osVersion: string;
  locale: string;
  sessionId: string;
  userId?: string;
};

export type ErrorReport = {
  name: string;
  category: string;
  message: string;
  userMessage: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
  cause?: { name: string; message: string };
  breadcrumbs: Breadcrumb[];
  observability: ObservabilityContext;
};

export type AnalyticsValue = string | number | boolean | null;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  timestamp: string;
  properties?: Record<string, AnalyticsValue>;
  observability: ObservabilityContext;
};

export type Breadcrumb = {
  timestamp: string;
  kind: "event" | "navigation" | "info";
  name: string;
  properties?: Record<string, AnalyticsValue>;
};

export interface ErrorSink {
  report(report: ErrorReport): Promise<void>;
}

export interface AnalyticsSink {
  track(event: AnalyticsEvent): Promise<void>;
}
