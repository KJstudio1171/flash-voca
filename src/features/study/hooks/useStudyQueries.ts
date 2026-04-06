import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import { LogReviewInput } from "@/src/core/domain/models";

export const studyQueryKeys = {
  snapshot: (deckId: string) => ["study", deckId] as const,
};

export function useStudyDeckQuery(deckId: string) {
  const { studySessionService } = useAppServices();

  return useQuery({
    queryKey: studyQueryKeys.snapshot(deckId),
    queryFn: () => studySessionService.getSnapshotAsync(deckId),
    enabled: Boolean(deckId),
  });
}

export function useRecordReviewMutation(deckId: string) {
  const { studySessionService } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogReviewInput) => studySessionService.recordReviewAsync(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studyQueryKeys.snapshot(deckId) });
    },
  });
}
