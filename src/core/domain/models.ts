export type DeckSourceType = "official" | "user";
export type EntitlementStatus = "active" | "expired" | "pending" | "revoked";

export interface Deck {
  id: string;
  title: string;
  description: string | null;
  sourceType: DeckSourceType;
  ownerId: string | null;
  accentColor: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCard {
  id: string;
  deckId: string;
  term: string;
  meaning: string;
  example: string | null;
  note: string | null;
  position: number;
}

export interface DeckDetail extends Deck {
  cards: DeckCard[];
}

export interface Bundle {
  id: string;
  title: string;
  description: string;
  priceText: string;
  currencyCode: string;
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
  updatedAt: string;
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
  cards: {
    id?: string;
    term: string;
    meaning: string;
    example?: string | null;
    note?: string | null;
    position: number;
  }[];
}

export interface LogReviewInput {
  deckId: string;
  cardId: string;
  rating: number;
  elapsedMs: number;
}
