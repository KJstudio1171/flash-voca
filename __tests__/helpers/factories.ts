import type {
  Deck,
  DeckCard,
  DeckDetail,
  LogReviewInput,
  UserCardState,
} from "@/src/core/domain/models";
import { TEST_USER_ID } from "./MockAuthService";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `mock-${counter}`;
}

export function createMockDeck(overrides?: Partial<Deck>): Deck {
  const id = overrides?.id ?? nextId();
  return {
    id,
    title: `Deck ${id}`,
    description: null,
    sourceType: "user",
    ownerId: TEST_USER_ID,
    accentColor: "#6366F1",
    visibility: "private",
    sourceLanguage: "en",
    targetLanguage: "ko",
    cardCount: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockDeckCard(overrides?: Partial<DeckCard>): DeckCard {
  const id = overrides?.id ?? nextId();
  return {
    id,
    deckId: "deck-1",
    term: `term-${id}`,
    meaning: `meaning-${id}`,
    pronunciation: null,
    partOfSpeech: null,
    difficulty: "medium",
    example: null,
    exampleTranslation: null,
    note: null,
    tags: [],
    synonyms: null,
    antonyms: null,
    relatedExpressions: null,
    source: null,
    imageUri: null,
    position: 0,
    ...overrides,
  };
}

export function createMockDeckDetail(
  overrides?: Partial<DeckDetail>,
): DeckDetail {
  const base = createMockDeck(overrides);
  return {
    ...base,
    cards: overrides?.cards ?? [],
    activities: overrides?.activities ?? [],
    cardCount: overrides?.cardCount ?? (overrides?.cards?.length ?? 0),
  };
}

export function createMockCardState(
  overrides?: Partial<UserCardState>,
): UserCardState {
  const id = overrides?.id ?? nextId();
  return {
    id,
    deckId: "deck-1",
    cardId: "card-1",
    userId: TEST_USER_ID,
    masteryLevel: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    isBookmarked: false,
    algorithmData: {},
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockLogReviewInput(
  overrides?: Partial<LogReviewInput>,
): LogReviewInput {
  return {
    deckId: "deck-1",
    cardId: "card-1",
    rating: "good",
    elapsedMs: 2000,
    ...overrides,
  };
}
