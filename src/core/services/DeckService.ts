import { SaveDeckPayload } from "@/src/core/domain/models";
import { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";

export class DeckService {
  constructor(private readonly deckRepository: DeckRepository) {}

  listDecksAsync() {
    return this.deckRepository.listDecksAsync();
  }

  getDeckByIdAsync(deckId: string) {
    return this.deckRepository.getDeckByIdAsync(deckId);
  }

  saveDeckAsync(payload: SaveDeckPayload) {
    return this.deckRepository.saveDeckAsync(payload);
  }

  deleteDeckAsync(deckId: string) {
    return this.deckRepository.deleteDeckAsync(deckId);
  }
}
