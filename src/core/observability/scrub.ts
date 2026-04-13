import {
  analyticsEventRegistry,
  type AnalyticsEventName,
} from "@/src/core/observability/eventRegistry";
import type { AnalyticsValue } from "@/src/core/observability/types";

const ALLOWED_ERROR_CONTEXT_KEYS = new Set<string>([
  "deckId",
  "cardId",
  "bundleId",
  "userId",
  "sessionId",
  "operation",
  "repository",
  "method",
  "httpStatus",
  "code",
  "url",
  "retryCount",
  "elapsedMs",
  "attemptCount",
]);

const STRING_MAX_LEN = 200;

function sanitizeValue(v: unknown): unknown {
  if (v === null || typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v === "string") {
    return v.length > STRING_MAX_LEN ? v.slice(0, STRING_MAX_LEN) : v;
  }
  return "[redacted]";
}

export function scrubErrorContext(
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_ERROR_CONTEXT_KEYS.has(k)) continue;
    out[k] = sanitizeValue(v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function scrubAnalyticsProperties<N extends AnalyticsEventName>(
  eventName: N,
  raw: Record<string, unknown> | undefined,
): Record<string, AnalyticsValue> | undefined {
  if (!raw) return undefined;
  const allowed = new Set<string>(
    analyticsEventRegistry[eventName].allowedProps as readonly string[],
  );
  const out: Record<string, AnalyticsValue> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k)) continue;
    const sanitized = sanitizeValue(v);
    if (
      sanitized === null ||
      typeof sanitized === "string" ||
      typeof sanitized === "number" ||
      typeof sanitized === "boolean"
    ) {
      out[k] = sanitized;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
