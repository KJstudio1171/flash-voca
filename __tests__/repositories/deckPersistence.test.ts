import {
  buildDeckActivities,
  buildRemoteDeckPayload,
  normalizeDeckSavePayload,
} from "@/src/core/repositories/sqlite/deckPersistence";
import { createMockDeckCard } from "@/__tests__/helpers/factories";

describe("deckPersistence", () => {
  it("normalizes deck and card input for local persistence", () => {
    const now = "2026-04-29T00:00:00.000Z";
    const normalized = normalizeDeckSavePayload(
      {
        title: "  My Deck  ",
        description: "  ",
        accentColor: undefined,
        visibility: undefined,
        sourceLanguage: " ",
        targetLanguage: " ja ",
        cards: [
          createMockDeckCard({
            id: "card-1",
            term: " apple ",
            meaning: " 사과 ",
            tags: [" fruit ", "fruit", ""],
            difficulty: undefined,
            position: 5,
          }),
        ],
      },
      "deck-1",
      now,
    );

    expect(normalized).toMatchObject({
      deckId: "deck-1",
      title: "My Deck",
      description: null,
      accentColor: "#0F766E",
      visibility: "private",
      sourceLanguage: "en",
      targetLanguage: "ja",
    });
    expect(normalized.persistedCards[0]).toMatchObject({
      id: "card-1",
      term: "apple",
      meaning: "사과",
      tags: ["fruit"],
      difficulty: "medium",
      position: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  it("builds activity records from card additions, edits, and deletes", () => {
    const existingCard = createMockDeckCard({
      id: "card-1",
      term: "old",
      meaning: "old meaning",
    });
    const normalized = normalizeDeckSavePayload(
      {
        title: "Deck",
        cards: [
          createMockDeckCard({
            id: "card-1",
            term: "old",
            meaning: "new meaning",
            position: 0,
          }),
          createMockDeckCard({ id: "card-2", term: "new", position: 1 }),
        ],
      },
      "deck-1",
      "2026-04-29T00:00:00.000Z",
    );

    const activities = buildDeckActivities({
      existingDeck: true,
      existingCardsById: new Map([
        [existingCard.id, existingCard],
        ["card-deleted", createMockDeckCard({ id: "card-deleted", term: "gone" })],
      ]),
      persistedCards: normalized.persistedCards,
    });

    expect(activities).toEqual([
      { type: "deck_updated", subject: "" },
      { type: "card_updated", subject: "old" },
      { type: "card_added", subject: "new" },
      { type: "card_deleted", subject: "gone" },
    ]);
  });

  it("builds the remote deck payload shape used by pending sync", () => {
    const now = "2026-04-29T00:00:00.000Z";
    const normalized = normalizeDeckSavePayload(
      {
        title: "Deck",
        cards: [createMockDeckCard({ id: "card-1", position: 0 })],
      },
      "deck-1",
      now,
    );

    expect(buildRemoteDeckPayload(normalized, "2026-01-01T00:00:00.000Z", now))
      .toMatchObject({
        deck: {
          id: "deck-1",
          deletedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: now,
        },
        cards: [
          {
            id: "card-1",
            deckId: "deck-1",
            deletedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      });
  });
});
