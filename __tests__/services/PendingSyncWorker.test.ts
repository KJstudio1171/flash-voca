import {
  DeckSyncOperationHandler,
  PendingSyncWorker,
  ReviewLogSyncOperationHandler,
  UserCardStateSyncOperationHandler,
} from "@/src/core/services/PendingSyncWorker";
import {
  createMockDeckRepository,
  createMockPendingSyncRepository,
  createMockStudyRepository,
} from "@/__tests__/helpers/mockRepositories";
import { createMockRemoteDeckGateway } from "@/__tests__/helpers/MockRemoteDeckGateway";
import { createMockRemoteStudyGateway } from "@/__tests__/helpers/MockRemoteStudyGateway";
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
    const deckRepo = createMockDeckRepository();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        { id: "op-1", entityType: "deck", entityId: "deck_x", operationType: "upsert",
          payload: upsertPayload, attemptCount: 0, availableAt: "2026-04-28T00:00:00Z" },
      ]),
    });
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();

    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );
    const result = await worker.flushDeckOperationsAsync();

    expect(remote.upsertDeckAsync).toHaveBeenCalledWith(TEST_USER_ID, upsertPayload);
    expect(queue.deleteAsync).toHaveBeenCalledWith("op-1");
    expect(deckRepo.markDeckSyncedAsync).toHaveBeenCalledWith("deck_x");
    expect(result).toEqual({ succeeded: 1, failed: 0 });
  });

  it("processes delete ops via softDeleteDeckAsync", async () => {
    const deckRepo = createMockDeckRepository();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        { id: "op-2", entityType: "deck", entityId: "deck_y", operationType: "delete",
          payload: { id: "deck_y", deletedAt: "2026-04-28T01:00:00Z" },
          attemptCount: 0, availableAt: "2026-04-28T00:00:00Z" },
      ]),
    });
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );

    await worker.flushDeckOperationsAsync();

    expect(remote.softDeleteDeckAsync).toHaveBeenCalledWith(
      TEST_USER_ID, "deck_y", "2026-04-28T01:00:00Z",
    );
    expect(queue.deleteAsync).toHaveBeenCalledWith("op-2");
  });

  it("on failure increments attempt and schedules backoff (not permanent until 5)", async () => {
    const deckRepo = createMockDeckRepository();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        { id: "op-3", entityType: "deck", entityId: "deck_y", operationType: "upsert",
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
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );

    const result = await worker.flushDeckOperationsAsync();

    expect(queue.markFailedAsync).toHaveBeenCalledWith(
      "op-3",
      expect.objectContaining({ permanent: false }),
      expect.any(String),
      expect.any(Number),
    );
    expect(result).toEqual({ succeeded: 0, failed: 1 });
  });

  it("marks op as permanently failed when attemptCount reaches 4 (5th failure)", async () => {
    const deckRepo = createMockDeckRepository();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        { id: "op-4", entityType: "deck", entityId: "deck_y", operationType: "upsert",
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
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );

    await worker.flushDeckOperationsAsync();

    expect(queue.markFailedAsync).toHaveBeenCalledWith(
      "op-4",
      expect.objectContaining({ permanent: true }),
      expect.any(String),
      5,
    );
  });

  it("returns 0/0 when queue is empty", async () => {
    const deckRepo = createMockDeckRepository();
    const queue = createMockPendingSyncRepository();
    const remote = createMockRemoteDeckGateway();
    const auth = createMockAuthService();
    const worker = new PendingSyncWorker(
      queue,
      [new DeckSyncOperationHandler(deckRepo, remote)],
      auth,
    );

    const result = await worker.flushDeckOperationsAsync();

    expect(result).toEqual({ succeeded: 0, failed: 0 });
    expect(remote.upsertDeckAsync).not.toHaveBeenCalled();
  });

  it("processes review log upsert ops and marks them synced", async () => {
    const payload = {
      id: "review-1",
      deckId: "deck-1",
      cardId: "card-1",
      userId: TEST_USER_ID,
      rating: 3,
      elapsedMs: 1200,
      reviewedAt: "2026-04-28T00:00:00Z",
      previousSrsState: {
        masteryLevel: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        nextReviewAt: null,
        lastReviewedAt: null,
        algorithmData: {},
      },
      nextSrsState: {
        masteryLevel: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        nextReviewAt: "2026-04-29T00:00:00Z",
        lastReviewedAt: "2026-04-28T00:00:00Z",
        algorithmData: {},
      },
    };
    const studyRepo = createMockStudyRepository();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-review",
          entityType: "review_log",
          entityId: "review-1",
          operationType: "upsert",
          payload,
          attemptCount: 0,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const remote = createMockRemoteStudyGateway();
    const worker = new PendingSyncWorker(
      queue,
      [new ReviewLogSyncOperationHandler(studyRepo, remote)],
      createMockAuthService(),
    );

    const result = await worker.flushOperationsAsync();

    expect(remote.upsertReviewLogAsync).toHaveBeenCalledWith(TEST_USER_ID, payload);
    expect(studyRepo.markReviewLogSyncedAsync).toHaveBeenCalledWith("review-1");
    expect(result).toEqual({ succeeded: 1, failed: 0 });
  });

  it("processes user card state upsert ops and marks them synced", async () => {
    const payload = {
      id: "state-1",
      deckId: "deck-1",
      cardId: "card-1",
      userId: TEST_USER_ID,
      masteryLevel: 2,
      easeFactor: 2.6,
      intervalDays: 3,
      nextReviewAt: "2026-05-01T00:00:00Z",
      lastReviewedAt: "2026-04-28T00:00:00Z",
      isBookmarked: true,
      algorithmData: {},
      createdAt: "2026-04-28T00:00:00Z",
      updatedAt: "2026-04-28T00:00:00Z",
    };
    const studyRepo = createMockStudyRepository();
    const queue = createMockPendingSyncRepository({
      listPendingOperationsAsync: jest.fn().mockResolvedValue([
        {
          id: "op-state",
          entityType: "user_card_state",
          entityId: "state-1",
          operationType: "upsert",
          payload,
          attemptCount: 0,
          availableAt: "2026-04-28T00:00:00Z",
        },
      ]),
    });
    const remote = createMockRemoteStudyGateway();
    const worker = new PendingSyncWorker(
      queue,
      [new UserCardStateSyncOperationHandler(studyRepo, remote)],
      createMockAuthService(),
    );

    const result = await worker.flushOperationsAsync();

    expect(remote.upsertUserCardStateAsync).toHaveBeenCalledWith(TEST_USER_ID, payload);
    expect(studyRepo.markUserCardStateSyncedAsync).toHaveBeenCalledWith("state-1");
    expect(result).toEqual({ succeeded: 1, failed: 0 });
  });
});
