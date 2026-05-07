import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppServicesContext";
import { SyncError } from "@/src/core/errors";

export function useDeckSync() {
  const { deckSyncService } = useAppServices();
  const queryClient = useQueryClient();

  const sync = useMutation({
    mutationFn: async () => {
      if (!deckSyncService) {
        throw new SyncError({ context: { reason: "service_unavailable" } });
      }
      return deckSyncService.syncAsync({ trigger: "manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });

  return { sync };
}

export function useFailedDeckOpsCount() {
  const { pendingSyncRepository } = useAppServices();
  return useQuery({
    queryKey: ["deckSync", "failedCount"],
    queryFn: () => pendingSyncRepository.countFailedAsync(["deck"]),
    enabled: !!pendingSyncRepository,
    staleTime: 30_000,
  });
}
