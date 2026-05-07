import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppServicesContext";
import { LogReviewInput } from "@/src/core/domain/models";
import { homeQueryKeys } from "@/src/features/home/hooks/useHomeSummaryQuery";

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studyQueryKeys.snapshot(deckId) }),
        queryClient.invalidateQueries({ queryKey: homeQueryKeys.deckSummaries }),
        queryClient.invalidateQueries({ queryKey: homeQueryKeys.summary }),
      ]);
    },
  });
}

export function useToggleBookmarkMutation(deckId: string) {
  const { studySessionService } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { cardId: string; isBookmarked: boolean }) =>
      studySessionService.setBookmarkAsync({
        deckId,
        cardId: input.cardId,
        isBookmarked: input.isBookmarked,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studyQueryKeys.snapshot(deckId) });
    },
  });
}

export function useUndoLastReviewMutation(deckId: string) {
  const { studySessionService } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => studySessionService.undoLastReviewAsync(deckId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studyQueryKeys.snapshot(deckId) }),
        queryClient.invalidateQueries({ queryKey: homeQueryKeys.deckSummaries }),
        queryClient.invalidateQueries({ queryKey: homeQueryKeys.summary }),
      ]);
    },
  });
}
