import { DeckSyncService } from "@/src/core/services/DeckSyncService";
import {
  DeckSyncOperationHandler,
  PendingSyncWorker,
} from "@/src/core/services/PendingSyncWorker";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import {
  createMockDeckRepository,
  createMockPendingSyncRepository,
} from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckGateway } from "@/__tests__/helpers/MockRemoteDeckGateway";
import { createMockAuthService, TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";
import { createMockAppMetaStore } from "@/__tests__/helpers/MockAppMetaStore";
import { createMockRemoteDeckPayload } from "@/__tests__/helpers/createMockRemoteDeckPayload";

describe("DeckSyncService.syncAsync", () => {
  it("runs push then pull and updates last_pulled_at", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway({
      pullDecksUpdatedAfterAsync: jest.fn().mockResolvedValue([
        createMockRemoteDeckPayload({
          id: "deck-cursor",
          updatedAt: "2026-04-28T10:00:00Z",
        }),
      ]),
    });
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore();
    const queue = createMockPendingSyncRepository();
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    const result = await svc.syncAsync({ trigger: "manual" });

    expect(remote.pullDecksUpdatedAfterAsync).toHaveBeenCalledWith(
      TEST_USER_ID, null, 200,
    );
    expect(meta.setValueAsync).toHaveBeenCalledWith(
      "deck_sync.last_pulled_at",
      JSON.stringify({ updatedAt: "2026-04-28T10:00:00Z", id: "deck-cursor" }),
    );
    expect(result.pulled).toBe(1);
  });

  it("uses stored last_pulled_at on subsequent runs", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore({
      "deck_sync.last_pulled_at": JSON.stringify({
        updatedAt: "2026-04-27T00:00:00Z",
        id: "deck-prev",
      }),
    });
    const queue = createMockPendingSyncRepository();
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    await svc.syncAsync({ trigger: "manual" });

    expect(remote.pullDecksUpdatedAfterAsync).toHaveBeenCalledWith(
      TEST_USER_ID,
      { updatedAt: "2026-04-27T00:00:00Z", id: "deck-prev" },
      200,
    );
  });

  it("does not pull remote decks when pending local flush has failures", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-fail",
          entityType: "deck",
          entityId: "deck-1",
          operationType: "upsert",
          payload: {
            deck: createMockRemoteDeckPayload({ id: "deck-1" }).deck,
            cards: [],
          },
          attemptCount: 0,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const failingRemote = createMockRemoteDeckGateway({
      upsertDeckAsync: jest.fn().mockRejectedValue(new Error("network")),
      pullDecksUpdatedAfterAsync: remote.pullDecksUpdatedAfterAsync,
    });
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, failingRemote)],
      auth,
    );
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({
      worker,
      merger,
      remote: failingRemote,
      auth,
      appMeta: meta,
    });
    const result = await svc.syncAsync({ trigger: "manual" });

    expect(failingRemote.pullDecksUpdatedAfterAsync).not.toHaveBeenCalled();
    expect(meta.setValueAsync).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it("paginates while batches return full page", async () => {
    const deckRepo = createMockDeckRepository();
    const fullBatch = Array.from({ length: 200 }, (_, i) =>
      createMockRemoteDeckPayload({
        id: `deck_${i}`,
        updatedAt: `2026-04-28T00:00:${String(i % 60).padStart(2, "0")}Z`,
      }),
    );
    const pull = jest
      .fn()
      .mockResolvedValueOnce(fullBatch)
      .mockResolvedValueOnce([]);
    const remote = createMockRemoteDeckGateway({
      pullDecksUpdatedAfterAsync: pull,
    });
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore();
    const queue = createMockPendingSyncRepository();
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    await svc.syncAsync({ trigger: "manual" });

    expect(pull).toHaveBeenCalledTimes(2);
  });
});
