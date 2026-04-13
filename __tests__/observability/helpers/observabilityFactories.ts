import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import { ContextEnricher } from "@/src/core/observability/contextEnricher";
import type { ObservabilityContext } from "@/src/core/observability/types";

export function makeEnricher(
  overrides: Partial<{
    installId: string;
    appVersion: string;
    platform: "android" | "ios" | "web";
    osVersion: string;
    locale: string;
    sessionId: string;
  }> = {},
): ContextEnricher {
  const defaults = {
    installId: "install-test",
    appVersion: "0.0.0",
    platform: "android" as const,
    osVersion: "14",
    locale: "ko",
    sessionId: "session-test",
  };
  const merged = { ...defaults, ...overrides };
  return new ContextEnricher(
    merged.installId,
    merged.appVersion,
    merged.platform,
    merged.osVersion,
    () => merged.locale,
    merged.sessionId,
  );
}

export function makeBreadcrumbBuffer(capacity = 50): BreadcrumbBuffer {
  return new BreadcrumbBuffer(capacity);
}

export function makeObservabilityContext(
  overrides: Partial<ObservabilityContext> = {},
): ObservabilityContext {
  return {
    installId: "install-test",
    appVersion: "0.0.0",
    platform: "android",
    osVersion: "14",
    locale: "ko",
    sessionId: "session-test",
    userId: undefined,
    ...overrides,
  };
}
