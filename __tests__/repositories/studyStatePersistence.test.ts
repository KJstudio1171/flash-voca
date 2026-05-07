import {
  buildPreviousSrsState,
  mapUserCardState,
  parseSrsStateSnapshot,
  serializeSrsStateSnapshot,
} from "@/src/core/repositories/sqlite/studyStatePersistence";

describe("studyStatePersistence", () => {
  it("maps persisted state rows into domain state with parsed algorithm data", () => {
    const state = mapUserCardState({
      id: "state-1",
      deckId: "deck-1",
      cardId: "card-1",
      userId: "user-1",
      masteryLevel: 3,
      easeFactor: 2.7,
      intervalDays: 4,
      nextReviewAt: "2026-04-30T00:00:00.000Z",
      lastReviewedAt: "2026-04-29T00:00:00.000Z",
      isBookmarked: 1,
      algorithmData: '{"box":3}',
      syncState: "pending",
      lastSyncedAt: null,
      createdAt: "2026-04-29T00:00:00.000Z",
      updatedAt: "2026-04-29T00:00:00.000Z",
    });

    expect(state).toMatchObject({
      id: "state-1",
      masteryLevel: 3,
      easeFactor: 2.7,
      intervalDays: 4,
      isBookmarked: true,
      algorithmData: { box: 3 },
    });
  });

  it("builds default previous SRS state when no row exists", () => {
    expect(buildPreviousSrsState(null)).toEqual({
      masteryLevel: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
      algorithmData: {},
    });
  });

  it("round-trips SRS snapshots used by review undo", () => {
    const snapshot = {
      masteryLevel: 2,
      easeFactor: 2.7,
      intervalDays: 5,
      nextReviewAt: "2026-05-04T00:00:00.000Z",
      lastReviewedAt: "2026-04-29T00:00:00.000Z",
      algorithmData: { box: 3 },
    };

    expect(parseSrsStateSnapshot(serializeSrsStateSnapshot(snapshot))).toEqual(
      snapshot,
    );
  });
});
