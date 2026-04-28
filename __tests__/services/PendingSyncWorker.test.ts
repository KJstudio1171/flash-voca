import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";
import { createMockDeckRepository } from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckGateway } from "@/__tests__/helpers/MockRemoteDeckGateway";
import { createMockAuthService, TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";

describe("PendingSyncWorker.flushDeckOperationsAsync", () => {
  it("processes upsert ops and marks deck synced after success", async () => {
    const upsertPayload = {
      deck: {
        id: "deck_x", title: "X", description: null, accentColor: "#000",
        visibility: "private", sourceLanguage: "en", targetLanguage: "ko",
        deletedAt: null, createdAt: "2026-04-28T00:00:00Z", updatedAt: "2026-04-28T00:00:00Z",
      },
      cards: [],
    };
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        { id: "op-1", entityId: "deck_x", operationType: "upsert",
          payload: upsertPayload, attemptCount: 0, availableAt: "2026-04-28T00:00:00Z" },
      ]),
    });
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();

    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const result = await worker.flushDeckOperationsAsync();

    expect(remote.upsertDeckAsync).toHaveBeenCalledWith(TEST_USER_ID, upsertPayload);
    expect(deckRepo.deleteOpAsync).toHaveBeenCalledWith("op-1");
    expect(deckRepo.markDeckSyncedAsync).toHaveBeenCalledWith("deck_x");
    expect(result).toEqual({ succeeded: 1, failed: 0 });
  });

  it("processes delete ops via softDeleteDeckAsync", async () => {
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        { id: "op-2", entityId: "deck_y", operationType: "delete",
          payload: { id: "deck_y", deletedAt: "2026-04-28T01:00:00Z" },
          attemptCount: 0, availableAt: "2026-04-28T00:00:00Z" },
      ]),
    });
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    await worker.flushDeckOperationsAsync();

    expect(remote.softDeleteDeckAsync).toHaveBeenCalledWith(
      TEST_USER_ID, "deck_y", "2026-04-28T01:00:00Z",
    );
    expect(deckRepo.deleteOpAsync).toHaveBeenCalledWith("op-2");
  });

  it("on failure increments attempt and schedules backoff (not permanent until 5)", async () => {
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        { id: "op-3", entityId: "deck_y", operationType: "upsert",
          payload: { deck: { id: "deck_y", title: "y", description: null, accentColor: "#0",
            visibility: "private", sourceLanguage: "en", targetLanguage: "ko",
            deletedAt: null, createdAt: "x", updatedAt: "x" }, cards: [] },
          attemptCount: 2, availableAt: "2026-04-28T00:00:00Z" },
      ]),
    });
    const remote = createMockRemoteDeckGateway({
      upsertDeckAsync: jest.fn().mockRejectedValue(new Error("net")),
    });
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    const result = await worker.flushDeckOperationsAsync();

    expect(deckRepo.markOpFailedAsync).toHaveBeenCalledWith(
      "op-3",
      expect.objectContaining({ permanent: false }),
      expect.any(String),
    );
    expect(result).toEqual({ succeeded: 0, failed: 1 });
  });

  it("marks op as permanently failed when attemptCount reaches 4 (5th failure)", async () => {
    const deckRepo = createMockDeckRepository({
      listPendingDeckOpsAsync: jest.fn().mockResolvedValue([
        { id: "op-4", entityId: "deck_y", operationType: "upsert",
          payload: { deck: { id: "deck_y", title: "y", description: null, accentColor: "#0",
            visibility: "private", sourceLanguage: "en", targetLanguage: "ko",
            deletedAt: null, createdAt: "x", updatedAt: "x" }, cards: [] },
          attemptCount: 4, availableAt: "2026-04-28T00:00:00Z" },
      ]),
    });
    const remote = createMockRemoteDeckGateway({
      upsertDeckAsync: jest.fn().mockRejectedValue(new Error("net")),
    });
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    await worker.flushDeckOperationsAsync();

    expect(deckRepo.markOpFailedAsync).toHaveBeenCalledWith(
      "op-4",
      expect.objectContaining({ permanent: true }),
      expect.any(String),
    );
  });

  it("returns 0/0 when queue is empty", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);

    const result = await worker.flushDeckOperationsAsync();

    expect(result).toEqual({ succeeded: 0, failed: 0 });
    expect(remote.upsertDeckAsync).not.toHaveBeenCalled();
  });
});
