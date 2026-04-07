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
    ...overrides,
  };
}

export function createMockStudyRepository(
  overrides?: Partial<StudyRepository>,
): StudyRepository {
  return {
    listCardStatesAsync: jest.fn().mockResolvedValue([]),
    logReviewAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
