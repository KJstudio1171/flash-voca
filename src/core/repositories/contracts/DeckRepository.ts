import { Deck, DeckDetail, SaveDeckPayload } from "@/src/core/domain/models";

export interface DeckRepository {
  listDecksAsync(): Promise<Deck[]>;
  getDeckByIdAsync(deckId: string): Promise<DeckDetail | null>;
  saveDeckAsync(payload: SaveDeckPayload): Promise<DeckDetail>;
  deleteDeckAsync(deckId: string): Promise<void>;
}
