import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export function useDeckSync() {
  const { deckSyncService } = useAppServices();
  const queryClient = useQueryClient();

  const sync = useMutation({
    mutationFn: async () => {
      if (!deckSyncService) throw new Error("deckSyncService unavailable");
      return deckSyncService.syncAsync({ trigger: "manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });

  return { sync };
}

export function useFailedDeckOpsCount() {
  const { deckRepository } = useAppServices();
  return useQuery({
    queryKey: ["deckSync", "failedCount"],
    queryFn: () => deckRepository.countFailedDeckOpsAsync(),
    enabled: !!deckRepository,
    staleTime: 30_000,
  });
}
