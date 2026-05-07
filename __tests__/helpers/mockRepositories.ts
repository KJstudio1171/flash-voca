import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { PendingSyncRepository } from "@/src/core/repositories/contracts/PendingSyncRepository";
import type { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";

export function createMockDeckRepository(
  overrides?: Partial<DeckRepository>,
): DeckRepository {
  return {
    listDecksAsync: jest.fn().mockResolvedValue([]),
    getDeckByIdAsync: jest.fn().mockResolvedValue(null),
    saveDeckAsync: jest.fn(),
    deleteDeckAsync: jest.fn(),
    hasPendingLocalChangesAsync: jest.fn().mockResolvedValue(false),
    markDeckSyncedAsync: jest.fn().mockResolvedValue(undefined),
    applyRemoteDeckAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockPendingSyncRepository(
  overrides?: Partial<PendingSyncRepository>,
): PendingSyncRepository {
  return {
    listPendingOperationsAsync: jest.fn().mockResolvedValue([]),
    markProcessingAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockResolvedValue(undefined),
    markFailedAsync: jest.fn().mockResolvedValue(undefined),
    countFailedAsync: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

export function createMockStudyRepository(
  overrides?: Partial<StudyRepository>,
): StudyRepository {
  return {
    listCardStatesAsync: jest.fn().mockResolvedValue([]),
    listCardStatesByDeckIdsAsync: jest.fn().mockResolvedValue([]),
    getHomeReviewStatsAsync: jest.fn().mockResolvedValue({
      studiedCards: 0,
      studyMinutes: 0,
      streakDays: 0,
      recentActivities: [],
    }),
    logReviewAsync: jest.fn().mockResolvedValue(undefined),
    setBookmarkAsync: jest.fn().mockResolvedValue(undefined),
    undoLastReviewAsync: jest.fn().mockResolvedValue(false),
    markReviewLogSyncedAsync: jest.fn().mockResolvedValue(undefined),
    markUserCardStateSyncedAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
