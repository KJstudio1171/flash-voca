export interface RemoteDeckRecord {
  id: string;
  title: string;
  description: string | null;
  accentColor: string;
  visibility: "private" | "public";
  sourceLanguage: string;
  targetLanguage: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteCardRecord {
  id: string;
  deckId: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  difficulty: "easy" | "medium" | "hard";
  example: string | null;
  exampleTranslation: string | null;
  note: string | null;
  tags: string[];
  synonyms: string | null;
  antonyms: string | null;
  relatedExpressions: string | null;
  source: string | null;
  position: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteDeckPayload {
  deck: RemoteDeckRecord;
  cards: RemoteCardRecord[];
}

export interface RemoteDeckPullCursor {
  updatedAt: string;
  id: string;
}

export interface RemoteDeckGateway {
  upsertDeckAsync(userId: string, payload: RemoteDeckPayload): Promise<void>;
  softDeleteDeckAsync(userId: string, deckId: string, deletedAt: string): Promise<void>;
  pullDecksUpdatedAfterAsync(
    userId: string,
    since: RemoteDeckPullCursor | null,
    limit: number,
  ): Promise<RemoteDeckPayload[]>;
}
