import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";
import type { NormalizedDeckSaveInput } from "@/src/core/repositories/sqlite/deckNormalizer";

export function buildRemoteDeckPayload(
  input: NormalizedDeckSaveInput,
  createdAt: string,
  updatedAt: string,
): RemoteDeckPayload {
  return {
    deck: {
      id: input.deckId,
      title: input.title,
      description: input.description,
      accentColor: input.accentColor,
      visibility: input.visibility,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
    cards: input.persistedCards.map((card) => ({
      id: card.id,
      deckId: input.deckId,
      term: card.term,
      meaning: card.meaning,
      pronunciation: card.pronunciation,
      partOfSpeech: card.partOfSpeech,
      difficulty: card.difficulty,
      example: card.example,
      exampleTranslation: card.exampleTranslation,
      note: card.note,
      tags: card.tags,
      synonyms: card.synonyms,
      antonyms: card.antonyms,
      relatedExpressions: card.relatedExpressions,
      source: card.source,
      position: card.position,
      deletedAt: null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    })),
  };
}
