import { DeckSyncService } from "@/src/core/services/DeckSyncService";
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { createMockDeckRepository } from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckGateway } from "@/__tests__/helpers/MockRemoteDeckGateway";
import { createMockAuthService, TEST_USER_ID } from "@/__tests__/helpers/MockAuthService";
import { createMockAppMetaStore } from "@/__tests__/helpers/MockAppMetaStore";
import { createMockRemoteDeckPayload } from "@/__tests__/helpers/createMockRemoteDeckPayload";

describe("DeckSyncService.syncAsync", () => {
  it("runs push then pull and updates last_pulled_at", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway({
      pullDecksUpdatedAfterAsync: jest.fn().mockResolvedValue([
        createMockRemoteDeckPayload({ updatedAt: "2026-04-28T10:00:00Z" }),
      ]),
    });
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore();
    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    const result = await svc.syncAsync({ trigger: "manual" });

    expect(remote.pullDecksUpdatedAfterAsync).toHaveBeenCalledWith(
      TEST_USER_ID, null, 200,
    );
    expect(meta.setValueAsync).toHaveBeenCalledWith(
      "deck_sync.last_pulled_at",
      "2026-04-28T10:00:00Z",
    );
    expect(result.pulled).toBe(1);
  });

  it("uses stored last_pulled_at on subsequent runs", async () => {
    const deckRepo = createMockDeckRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const meta = createMockAppMetaStore({
      "deck_sync.last_pulled_at": "2026-04-27T00:00:00Z",
    });
    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    await svc.syncAsync({ trigger: "manual" });

    expect(remote.pullDecksUpdatedAfterAsync).toHaveBeenCalledWith(
      TEST_USER_ID, "2026-04-27T00:00:00Z", 200,
    );
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
    const worker = new PendingSyncWorker(deckRepo, remote, auth);
    const merger = new DeckSyncMerger(deckRepo);

    const svc = new DeckSyncService({ worker, merger, remote, auth, appMeta: meta });
    await svc.syncAsync({ trigger: "manual" });

    expect(pull).toHaveBeenCalledTimes(2);
  });
});
