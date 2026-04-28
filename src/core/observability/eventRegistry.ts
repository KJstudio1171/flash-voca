import type { AnalyticsValue } from "@/src/core/observability/types";

export const analyticsEventRegistry = {
  app_opened: { allowedProps: [] as const },
  deck_created: { allowedProps: ["cardCount", "isCustom"] as const },
  deck_deleted: { allowedProps: ["cardCount"] as const },
  auth_anonymous_created: { allowedProps: ["userId"] as const },
  auth_rebind_completed: { allowedProps: ["fromUserId", "toUserId"] as const },
  auth_google_link_started: { allowedProps: [] as const },
  auth_google_linked: { allowedProps: ["userId"] as const },
  auth_link_failed: { allowedProps: ["reason"] as const },
  billing_purchase_started: { allowedProps: ["bundleId", "productId"] as const },
  billing_purchase_succeeded: { allowedProps: ["bundleId", "productId"] as const },
  billing_purchase_failed: { allowedProps: ["bundleId", "reason"] as const },
  billing_restore_started: { allowedProps: [] as const },
  billing_restore_completed: { allowedProps: ["restoredCount"] as const },
  billing_auth_gate_blocked: { allowedProps: ["bundleId"] as const },
  deck_sync_started: { allowedProps: ["trigger"] as const },
  deck_sync_completed: { allowedProps: ["pushed", "pulled", "durationMs"] as const },
  deck_sync_failed: { allowedProps: ["reason", "stage"] as const },
} satisfies Record<string, { allowedProps: readonly string[] }>;

export type AnalyticsEventName = keyof typeof analyticsEventRegistry;

export type AnalyticsEventProperties<N extends AnalyticsEventName> = Partial<
  Record<(typeof analyticsEventRegistry)[N]["allowedProps"][number], AnalyticsValue>
>;
