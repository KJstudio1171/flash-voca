export type DeckSourceType = "official" | "user";
export type DeckVisibility = "private" | "public";
export type CardDifficulty = "easy" | "medium" | "hard";
export type EntitlementStatus = "active" | "expired" | "pending" | "revoked";
export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface Deck {
  id: string;
  title: string;
  description: string | null;
  sourceType: DeckSourceType;
  ownerId: string | null;
  accentColor: string;
  visibility: DeckVisibility;
  sourceLanguage: string;
  targetLanguage: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCard {
  id: string;
  deckId: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  difficulty: CardDifficulty;
  example: string | null;
  exampleTranslation: string | null;
  note: string | null;
  tags: string[];
  synonyms: string | null;
  antonyms: string | null;
  relatedExpressions: string | null;
  source: string | null;
  imageUri: string | null;
  position: number;
}

export interface DeckDetail extends Deck {
  cards: DeckCard[];
  activities: DeckActivity[];
}

export type DeckActivityType = "card_added" | "card_updated" | "card_deleted" | "deck_updated";

export interface DeckActivity {
  id: string;
  deckId: string;
  activityType: DeckActivityType;
  summary: string;
  createdAt: string;
}

export interface Bundle {
  id: string;
  title: string;
  description: string;
  priceText: string;
  currencyCode: string;
  playProductId: string | null;
  coverColor: string;
  deckCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  id: string;
  bundleId: string;
  deckId: string;
  deckTitle: string;
  cardCount: number;
  position: number;
}

export interface BundleDetail extends Bundle {
  items: BundleItem[];
}

export interface StoreBundleSummary extends Bundle {
  owned: boolean;
}

export interface StoreBundleDetail extends BundleDetail {
  owned: boolean;
}

export interface Entitlement {
  id: string;
  userId: string;
  bundleId: string;
  provider: string;
  providerRef: string | null;
  status: EntitlementStatus;
  grantedAt: string;
  expiresAt: string | null;
  syncedAt: string | null;
}

export interface UserCardState {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  masteryLevel: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  isBookmarked: boolean;
  algorithmData: Record<string, unknown>;
  updatedAt: string;
}

export interface DeckSummary extends Deck {
  dueCount: number;
  masteredCount: number;
}

export interface HomeRecentReviewActivity {
  id: string;
  deckId: string;
  cardId: string;
  term: string;
  rating: number;
  reviewedAt: string;
}

export interface HomeReviewStats {
  studiedCards: number;
  studyMinutes: number;
  streakDays: number;
  recentActivities: HomeRecentReviewActivity[];
}

export interface HomeStudyStats extends HomeReviewStats {
  totalCards: number;
  dueCount: number;
  progress: number;
}

export interface HomeSummary {
  decks: DeckSummary[];
  stats: HomeStudyStats;
  recentActivities: HomeRecentReviewActivity[];
}

export interface StudyCard {
  card: DeckCard;
  state: UserCardState | null;
}

export interface StudyDeckSnapshot {
  deck: Deck;
  cards: StudyCard[];
  dueCount: number;
  masteredCount: number;
}

export interface SaveDeckPayload {
  id?: string;
  title: string;
  description?: string | null;
  accentColor?: string;
  visibility?: DeckVisibility;
  sourceLanguage?: string;
  targetLanguage?: string;
  cards: {
    id?: string;
    term: string;
    meaning: string;
    pronunciation?: string | null;
    partOfSpeech?: string | null;
    difficulty?: CardDifficulty;
    example?: string | null;
    exampleTranslation?: string | null;
    note?: string | null;
    tags?: string[];
    synonyms?: string | null;
    antonyms?: string | null;
    relatedExpressions?: string | null;
    source?: string | null;
    imageUri?: string | null;
    position: number;
  }[];
}

export interface LogReviewInput {
  deckId: string;
  cardId: string;
  rating: ReviewRating;
  elapsedMs: number;
}
