import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppServicesContext";

export const homeQueryKeys = {
  deckSummaries: ["deck-summaries"] as const,
  summary: ["home-summary"] as const,
};

export function useDeckSummaryListQuery() {
  const { studySessionService } = useAppServices();

  return useQuery({
    queryKey: homeQueryKeys.deckSummaries,
    queryFn: () => studySessionService.listDeckSummariesAsync(),
  });
}

export function useHomeSummaryQuery() {
  const { studySessionService } = useAppServices();

  return useQuery({
    queryKey: homeQueryKeys.summary,
    queryFn: () => studySessionService.getHomeSummaryAsync(),
  });
}
