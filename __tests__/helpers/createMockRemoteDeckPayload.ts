import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export function createMockRemoteDeckPayload(
  overrides: Partial<RemoteDeckPayload["deck"]> = {},
): RemoteDeckPayload {
  return {
    deck: {
      id: "deck_x",
      title: "X",
      description: null,
      accentColor: "#0F766E",
      visibility: "private",
      sourceLanguage: "en",
      targetLanguage: "ko",
      deletedAt: null,
      createdAt: "2026-04-28T00:00:00Z",
      updatedAt: "2026-04-28T00:00:00Z",
      ...overrides,
    },
    cards: [],
  };
}
