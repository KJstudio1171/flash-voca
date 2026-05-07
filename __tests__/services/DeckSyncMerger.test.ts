import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { createMockDeckRepository } from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckPayload } from "@/__tests__/helpers/createMockRemoteDeckPayload";
import type { DeckDetail } from "@/src/core/domain/models";

function localDeckDetail(updatedAt: string): DeckDetail {
  return {
    id: "deck_x",
    title: "x",
    description: null,
    sourceType: "user",
    ownerId: "u",
    accentColor: "#0",
    visibility: "private",
    sourceLanguage: "en",
    targetLanguage: "ko",
    cardCount: 0,
    createdAt: "2026-04-28T00:00:00Z",
    updatedAt,
    cards: [],
    activities: [],
  };
}

describe("DeckSyncMerger.mergePulledAsync", () => {
  it("applies remote when local does not exist", async () => {
    const deckRepo = createMockDeckRepository();
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload();
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ applied: 1, skipped: 0 });
  });

  it("applies remote when local updated_at is older", async () => {
    const deckRepo = createMockDeckRepository({
      getDeckByIdAsync: jest.fn().mockResolvedValue(
        localDeckDetail("2026-04-27T00:00:00Z"),
      ),
    });
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload({ updatedAt: "2026-04-28T12:00:00Z" });
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ applied: 1, skipped: 0 });
  });

  it("skips remote when local deck has pending changes", async () => {
    const deckRepo = createMockDeckRepository({
      hasPendingLocalChangesAsync: jest.fn().mockResolvedValue(true),
      getDeckByIdAsync: jest.fn().mockResolvedValue(
        localDeckDetail("2026-04-27T00:00:00Z"),
      ),
    });
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload({ updatedAt: "2026-04-28T12:00:00Z" });
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).not.toHaveBeenCalled();
    expect(deckRepo.getDeckByIdAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 0, skipped: 1 });
  });

  it("skips remote when local updated_at is newer or equal", async () => {
    const deckRepo = createMockDeckRepository({
      getDeckByIdAsync: jest.fn().mockResolvedValue(
        localDeckDetail("2026-04-28T12:00:00Z"),
      ),
    });
    const merger = new DeckSyncMerger(deckRepo);

    const payload = createMockRemoteDeckPayload({ updatedAt: "2026-04-28T00:00:00Z" });
    const result = await merger.mergePulledAsync([payload]);

    expect(deckRepo.applyRemoteDeckAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 0, skipped: 1 });
  });
});
