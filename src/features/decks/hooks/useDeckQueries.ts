import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import { SaveDeckPayload } from "@/src/core/domain/models";

export const deckQueryKeys = {
  all: ["decks"] as const,
  detail: (deckId: string) => ["decks", deckId] as const,
};

export function useDeckListQuery() {
  const { deckService } = useAppServices();

  return useQuery({
    queryKey: deckQueryKeys.all,
    queryFn: () => deckService.listDecksAsync(),
  });
}

export function useDeckDetailQuery(deckId: string, enabled = true) {
  const { deckService } = useAppServices();

  return useQuery({
    queryKey: deckQueryKeys.detail(deckId),
    queryFn: () => deckService.getDeckByIdAsync(deckId),
    enabled,
  });
}

export function useSaveDeckMutation() {
  const { deckService } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveDeckPayload) => deckService.saveDeckAsync(payload),
    onSuccess: async (deck) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: deckQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: deckQueryKeys.detail(deck.id) }),
      ]);
    },
  });
}
