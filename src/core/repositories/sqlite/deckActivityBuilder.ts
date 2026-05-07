import type {
  DeckActivityType,
  DeckCard,
} from "@/src/core/domain/models";
import type { PersistedCardInput } from "@/src/core/repositories/sqlite/deckNormalizer";

function getCardChangeSignature(card: DeckCard | PersistedCardInput) {
  return JSON.stringify({
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
    imageUri: card.imageUri,
    position: card.position,
  });
}

export function buildDeckActivities(input: {
  existingDeck: boolean;
  existingCardsById: Map<string, DeckCard>;
  persistedCards: PersistedCardInput[];
}) {
  const retainedCardIds = new Set(input.persistedCards.map((card) => card.id));
  const activities: { type: DeckActivityType; subject: string }[] = [];

  if (input.existingDeck) {
    activities.push({ type: "deck_updated", subject: "" });
  }

  for (const card of input.persistedCards) {
    const existingCard = input.existingCardsById.get(card.id);
    if (!existingCard) {
      activities.push({ type: "card_added", subject: card.term });
      continue;
    }

    if (getCardChangeSignature(existingCard) !== getCardChangeSignature(card)) {
      activities.push({ type: "card_updated", subject: card.term });
    }
  }

  for (const existingCard of input.existingCardsById.values()) {
    if (!retainedCardIds.has(existingCard.id)) {
      activities.push({ type: "card_deleted", subject: existingCard.term });
    }
  }

  return activities;
}
