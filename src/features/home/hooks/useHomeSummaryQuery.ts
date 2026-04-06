import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export function useDeckSummaryListQuery() {
  const { studySessionService } = useAppServices();

  return useQuery({
    queryKey: ["deck-summaries"],
    queryFn: () => studySessionService.listDeckSummariesAsync(),
  });
}
