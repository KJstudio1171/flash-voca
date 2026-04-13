import { SaveDeckPayload } from "@/src/core/domain/models";
import { trackSafely } from "@/src/core/observability";
import { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";

export class DeckService {
  constructor(private readonly deckRepository: DeckRepository) {}

  listDecksAsync() {
    return this.deckRepository.listDecksAsync();
  }

  getDeckByIdAsync(deckId: string) {
    return this.deckRepository.getDeckByIdAsync(deckId);
  }

  async saveDeckAsync(payload: SaveDeckPayload) {
    const isNew = !payload.id;
    const deck = await this.deckRepository.saveDeckAsync(payload);
    if (isNew) {
      trackSafely("deck_created", {
        cardCount: deck.cardCount,
        isCustom: deck.sourceType === "user",
      });
    }
    return deck;
  }

  async deleteDeckAsync(deckId: string) {
    const deck = await this.deckRepository.getDeckByIdAsync(deckId);
    await this.deckRepository.deleteDeckAsync(deckId);
    if (deck) {
      trackSafely("deck_deleted", { cardCount: deck.cardCount });
    }
  }
}
