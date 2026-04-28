import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";

export function createMockDeckRepository(
  overrides?: Partial<DeckRepository>,
): DeckRepository {
  return {
    listDecksAsync: jest.fn().mockResolvedValue([]),
    getDeckByIdAsync: jest.fn().mockResolvedValue(null),
    saveDeckAsync: jest.fn(),
    deleteDeckAsync: jest.fn(),
    listPendingDeckOpsAsync: jest.fn().mockResolvedValue([]),
    markOpProcessingAsync: jest.fn().mockResolvedValue(undefined),
    deleteOpAsync: jest.fn().mockResolvedValue(undefined),
    markOpFailedAsync: jest.fn().mockResolvedValue(undefined),
    countFailedDeckOpsAsync: jest.fn().mockResolvedValue(0),
    markDeckSyncedAsync: jest.fn().mockResolvedValue(undefined),
    applyRemoteDeckAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockStudyRepository(
  overrides?: Partial<StudyRepository>,
): StudyRepository {
  return {
    listCardStatesAsync: jest.fn().mockResolvedValue([]),
    getHomeReviewStatsAsync: jest.fn().mockResolvedValue({
      studiedCards: 0,
      studyMinutes: 0,
      streakDays: 0,
      recentActivities: [],
    }),
    logReviewAsync: jest.fn().mockResolvedValue(undefined),
    setBookmarkAsync: jest.fn().mockResolvedValue(undefined),
    undoLastReviewAsync: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}
