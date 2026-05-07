import { Deck, DeckDetail, SaveDeckPayload } from "@/src/core/domain/models";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface DeckRepository {
  listDecksAsync(): Promise<Deck[]>;
  getDeckByIdAsync(deckId: string): Promise<DeckDetail | null>;
  saveDeckAsync(payload: SaveDeckPayload): Promise<DeckDetail>;
  deleteDeckAsync(deckId: string): Promise<void>;
  hasPendingLocalChangesAsync(deckId: string): Promise<boolean>;
  markDeckSyncedAsync(deckId: string): Promise<void>;
  applyRemoteDeckAsync(payload: RemoteDeckPayload): Promise<void>;
}
