import { StudySessionService } from "@/src/core/services/StudySessionService";
import {
  createMockCardState,
  createMockDeck,
  createMockDeckCard,
  createMockDeckDetail,
  createMockLogReviewInput,
} from "@/__tests__/helpers/factories";
import { createMockAuthService } from "@/__tests__/helpers/MockAuthService";
import {
  createMockDeckRepository,
  createMockStudyRepository,
} from "@/__tests__/helpers/mockRepositories";
import type { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";

function createMockSrsPreferenceService(): SrsPreferenceService {
  return {
    getAlgorithmAsync: jest.fn().mockResolvedValue("leitner"),
    setAlgorithmAsync: jest.fn().mockResolvedValue(undefined),
  } as unknown as SrsPreferenceService;
}

describe("StudySessionService", () => {
  describe("listDeckSummariesAsync", () => {
    it("returns empty array when no decks exist", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.listDeckSummariesAsync();

      expect(result).toEqual([]);
    });

    it("counts all cards as due when no card states exist", async () => {
      const deck = createMockDeck({ id: "deck-1", cardCount: 5 });
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesByDeckIdsAsync: jest.fn().mockResolvedValue([]),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.listDeckSummariesAsync();

      expect(result).toHaveLength(1);
      expect(result[0].dueCount).toBe(5);
      expect(result[0].masteredCount).toBe(0);
    });

    it("excludes cards with future nextReviewAt from due count", async () => {
      const deck = createMockDeck({ id: "deck-1", cardCount: 3 });
      const states = [
        createMockCardState({
          cardId: "card-1",
          nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        createMockCardState({
          cardId: "card-2",
          nextReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
        }),
        createMockCardState({
          cardId: "card-3",
          nextReviewAt: null,
        }),
      ];
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesByDeckIdsAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.listDeckSummariesAsync();

      expect(result[0].dueCount).toBe(2);
    });

    it("counts cards with masteryLevel >= 3 as mastered", async () => {
      const deck = createMockDeck({ id: "deck-1", cardCount: 4 });
      const states = [
        createMockCardState({ cardId: "card-1", masteryLevel: 3 }),
        createMockCardState({ cardId: "card-2", masteryLevel: 5 }),
        createMockCardState({ cardId: "card-3", masteryLevel: 2 }),
        createMockCardState({ cardId: "card-4", masteryLevel: 0 }),
      ];
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesByDeckIdsAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.listDeckSummariesAsync();

      expect(result[0].masteredCount).toBe(2);
    });

    it("computes summaries independently for multiple decks", async () => {
      const deck1 = createMockDeck({ id: "deck-1", cardCount: 2 });
      const deck2 = createMockDeck({ id: "deck-2", cardCount: 3 });

      const statesByDeck: Record<string, ReturnType<typeof createMockCardState>[]> = {
        "deck-1": [
          createMockCardState({
            deckId: "deck-1",
            cardId: "card-1",
            masteryLevel: 3,
            nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
          }),
          createMockCardState({
            deckId: "deck-1",
            cardId: "card-2",
            masteryLevel: 1,
            nextReviewAt: null,
          }),
        ],
        "deck-2": [
          createMockCardState({
            deckId: "deck-2",
            cardId: "card-3",
            masteryLevel: 5,
            nextReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
          }),
          createMockCardState({
            deckId: "deck-2",
            cardId: "card-4",
            masteryLevel: 0,
            nextReviewAt: null,
          }),
        ],
      };

      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck1, deck2]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesByDeckIdsAsync: jest.fn().mockImplementation((deckIds: string[]) =>
          Promise.resolve(deckIds.flatMap((id) => statesByDeck[id] ?? [])),
        ),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.listDeckSummariesAsync();

      expect(result).toHaveLength(2);

      const summary1 = result.find((s) => s.id === "deck-1")!;
      // deck-1: cardCount=2, 1 future state → notDueCount=1 → dueCount=1; masteredCount=1 (level 3)
      expect(summary1.dueCount).toBe(1);
      expect(summary1.masteredCount).toBe(1);

      const summary2 = result.find((s) => s.id === "deck-2")!;
      // deck-2: cardCount=3, 0 future states → dueCount=3; masteredCount=1 (level 5)
      expect(summary2.dueCount).toBe(3);
      expect(summary2.masteredCount).toBe(1);
    });
  });

  describe("getHomeSummaryAsync", () => {
    it("combines deck progress with today's review stats", async () => {
      const deck = createMockDeck({ id: "deck-1", cardCount: 4 });
      const states = [
        createMockCardState({
          deckId: "deck-1",
          cardId: "card-1",
          masteryLevel: 3,
          nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        createMockCardState({
          deckId: "deck-1",
          cardId: "card-2",
          masteryLevel: 1,
          nextReviewAt: null,
        }),
      ];
      const recentActivities = [
        {
          id: "review-1",
          deckId: "deck-1",
          cardId: "card-2",
          term: "follow up",
          rating: 2,
          reviewedAt: "2026-04-28T01:00:00.000Z",
        },
      ];
      const deckRepo = createMockDeckRepository({
        listDecksAsync: jest.fn().mockResolvedValue([deck]),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesByDeckIdsAsync: jest.fn().mockResolvedValue(states),
        getHomeReviewStatsAsync: jest.fn().mockResolvedValue({
          studiedCards: 2,
          studyMinutes: 7,
          streakDays: 3,
          recentActivities,
        }),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.getHomeSummaryAsync("test-user");

      expect(result.decks).toHaveLength(1);
      expect(result.stats).toEqual({
        studiedCards: 2,
        studyMinutes: 7,
        streakDays: 3,
        recentActivities,
        totalCards: 4,
        dueCount: 3,
        progress: 0.25,
      });
      expect(result.recentActivities).toEqual(recentActivities);
      expect(studyRepo.getHomeReviewStatsAsync).toHaveBeenCalledWith("test-user");
    });

    it("returns empty home stats when no decks or reviews exist", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.getHomeSummaryAsync();

      expect(result).toEqual({
        decks: [],
        stats: {
          studiedCards: 0,
          studyMinutes: 0,
          streakDays: 0,
          recentActivities: [],
          totalCards: 0,
          dueCount: 0,
          progress: 0,
        },
        recentActivities: [],
      });
    });
  });

  describe("getSnapshotAsync", () => {
    it("returns null when deck does not exist", async () => {
      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(null),
      });
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.getSnapshotAsync("nonexistent-deck");

      expect(result).toBeNull();
    });

    it("maps card states to matching cards and leaves null for unmatched", async () => {
      const card1 = createMockDeckCard({ id: "card-1", deckId: "deck-1" });
      const card2 = createMockDeckCard({ id: "card-2", deckId: "deck-1" });
      const deck = createMockDeckDetail({
        id: "deck-1",
        cards: [card1, card2],
      });
      const state1 = createMockCardState({ cardId: "card-1", deckId: "deck-1" });

      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(deck),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue([state1]),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.getSnapshotAsync("deck-1");

      expect(result).not.toBeNull();
      expect(result!.cards[0].card.id).toBe("card-1");
      expect(result!.cards[0].state).toEqual(state1);
      expect(result!.cards[1].card.id).toBe("card-2");
      expect(result!.cards[1].state).toBeNull();
    });

    it("computes dueCount correctly based on nextReviewAt", async () => {
      const card1 = createMockDeckCard({ id: "card-1", deckId: "deck-1" });
      const card2 = createMockDeckCard({ id: "card-2", deckId: "deck-1" });
      const card3 = createMockDeckCard({ id: "card-3", deckId: "deck-1" });
      const deck = createMockDeckDetail({
        id: "deck-1",
        cards: [card1, card2, card3],
      });
      const states = [
        createMockCardState({
          cardId: "card-1",
          deckId: "deck-1",
          nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
        createMockCardState({
          cardId: "card-2",
          deckId: "deck-1",
          nextReviewAt: new Date(Date.now() - 86_400_000).toISOString(),
        }),
        // card-3 has no state
      ];

      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(deck),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.getSnapshotAsync("deck-1");

      // card-2 (past nextReviewAt) + card-3 (no state) = 2 due
      expect(result!.dueCount).toBe(2);
    });

    it("computes masteredCount correctly based on masteryLevel", async () => {
      const card1 = createMockDeckCard({ id: "card-1", deckId: "deck-1" });
      const card2 = createMockDeckCard({ id: "card-2", deckId: "deck-1" });
      const card3 = createMockDeckCard({ id: "card-3", deckId: "deck-1" });
      const deck = createMockDeckDetail({
        id: "deck-1",
        cards: [card1, card2, card3],
      });
      const states = [
        createMockCardState({
          cardId: "card-1",
          deckId: "deck-1",
          masteryLevel: 3,
        }),
        createMockCardState({
          cardId: "card-2",
          deckId: "deck-1",
          masteryLevel: 1,
        }),
        // card-3 has no state
      ];

      const deckRepo = createMockDeckRepository({
        getDeckByIdAsync: jest.fn().mockResolvedValue(deck),
      });
      const studyRepo = createMockStudyRepository({
        listCardStatesAsync: jest.fn().mockResolvedValue(states),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.getSnapshotAsync("deck-1");

      // only card-1 has masteryLevel >= 3
      expect(result!.masteredCount).toBe(1);
    });
  });

  describe("recordReviewAsync", () => {
    it("delegates to studyRepository.logReviewAsync with correct arguments", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());
      const input = createMockLogReviewInput();

      await service.recordReviewAsync(input, "test-user");

      expect(studyRepo.logReviewAsync).toHaveBeenCalledTimes(1);
      expect(studyRepo.logReviewAsync).toHaveBeenCalledWith(input, "test-user", expect.anything());
    });
  });

  describe("setBookmarkAsync", () => {
    it("delegates to studyRepository.setBookmarkAsync with correct arguments", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository();
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());
      const input = {
        deckId: "deck-1",
        cardId: "card-1",
        isBookmarked: true,
      };

      await service.setBookmarkAsync(input, "test-user");

      expect(studyRepo.setBookmarkAsync).toHaveBeenCalledTimes(1);
      expect(studyRepo.setBookmarkAsync).toHaveBeenCalledWith(input, "test-user");
    });
  });

  describe("undoLastReviewAsync", () => {
    it("delegates to studyRepository.undoLastReviewAsync with correct arguments", async () => {
      const deckRepo = createMockDeckRepository();
      const studyRepo = createMockStudyRepository({
        undoLastReviewAsync: jest.fn().mockResolvedValue(true),
      });
      const service = new StudySessionService(deckRepo, studyRepo, createMockAuthService(), createMockSrsPreferenceService());

      const result = await service.undoLastReviewAsync("deck-1", "test-user");

      expect(result).toBe(true);
      expect(studyRepo.undoLastReviewAsync).toHaveBeenCalledTimes(1);
      expect(studyRepo.undoLastReviewAsync).toHaveBeenCalledWith(
        "deck-1",
        "test-user",
      );
    });
  });
});
