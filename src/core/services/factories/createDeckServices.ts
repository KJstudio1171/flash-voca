import type { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import { DeckService } from "@/src/core/services/DeckService";

export function createDeckServices(input: {
  deckRepository: SqliteDeckRepository;
}) {
  return {
    deckService: new DeckService(input.deckRepository),
  };
}
