import type { AnalyticsValue } from "@/src/core/observability/types";

export const analyticsEventRegistry = {
  app_opened: {
    allowedProps: [] as const,
  },
  deck_created: {
    allowedProps: ["cardCount", "isCustom"] as const,
  },
  deck_deleted: {
    allowedProps: ["cardCount"] as const,
  },
  study_session_started: {
    allowedProps: ["deckId", "sessionMode"] as const,
  },
  study_session_completed: {
    allowedProps: ["deckId", "cardsStudied", "durationSec", "correctRate"] as const,
  },
} satisfies Record<string, { allowedProps: readonly string[] }>;

export type AnalyticsEventName = keyof typeof analyticsEventRegistry;

export type AnalyticsEventProperties<N extends AnalyticsEventName> = Partial<
  Record<(typeof analyticsEventRegistry)[N]["allowedProps"][number], AnalyticsValue>
>;
