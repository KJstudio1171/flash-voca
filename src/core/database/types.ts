import {
  CardDifficulty,
  DeckActivityType,
  DeckSourceType,
  DeckVisibility,
  EntitlementStatus,
} from "@/src/core/domain/models";

export type LocalSyncState = "failed" | "pending" | "synced";
export type SyncEntityType = "deck" | "entitlement" | "review_log" | "user_card_state";
export type SyncOperationType = "delete" | "upsert";
export type SyncOperationStatus = "failed" | "pending" | "processing";

export interface LocalDeckRecord {
  id: string;
  ownerId: string | null;
  title: string;
  description: string | null;
  sourceType: DeckSourceType;
  accentColor: string;
  visibility: DeckVisibility;
  sourceLanguage: string;
  targetLanguage: string;
  isDeleted: number;
  syncState: LocalSyncState;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalDeckCardRecord {
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
  tags: string;
  synonyms: string | null;
  antonyms: string | null;
  relatedExpressions: string | null;
  source: string | null;
  imageUri: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalDeckActivityRecord {
  id: string;
  deckId: string;
  activityType: DeckActivityType;
  summary: string;
  createdAt: string;
}

export interface LocalUserCardStateRecord {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  masteryLevel: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  isBookmarked: number;
  syncState: LocalSyncState;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalReviewLogRecord {
  id: string;
  deckId: string;
  cardId: string;
  userId: string;
  rating: number;
  elapsedMs: number;
  reviewedAt: string;
  syncState: LocalSyncState;
  syncedAt: string | null;
}

export interface PendingSyncOperationRecord {
  id: string;
  dedupeKey: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: string | null;
  status: SyncOperationStatus;
  attemptCount: number;
  availableAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CachedEntitlementRecord {
  id: string;
  userId: string;
  bundleId: string;
  provider: string;
  providerRef: string | null;
  status: EntitlementStatus;
  grantedAt: string;
  expiresAt: string | null;
  syncedAt: string | null;
  kind: string;
  auto_renewing: number;
  cacheUpdatedAt: string;
  rawPayload: string | null;
}

export interface LocalBundleRecord {
  id: string;
  title: string;
  description: string;
  price_text: string;
  currency_code: string;
  play_product_id: string | null;
  cover_color: string;
  is_published: number;
  created_at: string;
  updated_at: string;
}
