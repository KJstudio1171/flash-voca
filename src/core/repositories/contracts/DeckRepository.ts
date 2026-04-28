import { Deck, DeckDetail, SaveDeckPayload } from "@/src/core/domain/models";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface PendingDeckOp {
  id: string;
  entityId: string;
  operationType: "upsert" | "delete";
  payload: unknown;
  attemptCount: number;
  availableAt: string;
}

export interface DeckRepository {
  listDecksAsync(): Promise<Deck[]>;
  getDeckByIdAsync(deckId: string): Promise<DeckDetail | null>;
  saveDeckAsync(payload: SaveDeckPayload): Promise<DeckDetail>;
  deleteDeckAsync(deckId: string): Promise<void>;

  // Sync support (Phase 2)
  listPendingDeckOpsAsync(): Promise<PendingDeckOp[]>;
  markOpProcessingAsync(opId: string): Promise<void>;
  deleteOpAsync(opId: string): Promise<void>;
  markOpFailedAsync(
    opId: string,
    error: { message: string; permanent: boolean },
    nextAvailableAt: string,
  ): Promise<void>;
  countFailedDeckOpsAsync(): Promise<number>;
  markDeckSyncedAsync(deckId: string): Promise<void>;
  applyRemoteDeckAsync(payload: RemoteDeckPayload): Promise<void>;
}
