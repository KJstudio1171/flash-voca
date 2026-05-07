import {
  mapCardRow,
  mapDeckRow,
  toCardUpsertRows,
  toDeckUpsertRow,
} from "@/src/core/repositories/supabase/supabaseDeckMappers";
import { createMockRemoteDeckPayload } from "@/__tests__/helpers/createMockRemoteDeckPayload";

describe("supabaseDeckMappers", () => {
  it("maps Supabase deck and card rows to remote payload records", () => {
    expect(
      mapDeckRow({
        id: "deck-1",
        title: "Deck",
        description: null,
        accent_color: "#0F766E",
        visibility: "private",
        source_language: "en",
        target_language: "ko",
        deleted_at: null,
        created_at: "2026-04-29T00:00:00Z",
        updated_at: "2026-04-29T00:00:00Z",
      }),
    ).toMatchObject({
      id: "deck-1",
      accentColor: "#0F766E",
      sourceLanguage: "en",
      targetLanguage: "ko",
    });

    expect(
      mapCardRow({
        id: "card-1",
        deck_id: "deck-1",
        term: "term",
        meaning: "meaning",
        pronunciation: null,
        part_of_speech: null,
        difficulty: "medium",
        example: null,
        example_translation: null,
        note: null,
        tags: null,
        synonyms: null,
        antonyms: null,
        related_expressions: null,
        source: null,
        position: 0,
        deleted_at: null,
        created_at: "2026-04-29T00:00:00Z",
        updated_at: "2026-04-29T00:00:00Z",
      }),
    ).toMatchObject({
      id: "card-1",
      deckId: "deck-1",
      tags: [],
    });
  });

  it("maps remote payloads to Supabase upsert rows", () => {
    const payload = {
      ...createMockRemoteDeckPayload({ id: "deck-1" }),
      cards: [
        {
          id: "card-1",
          deckId: "deck-1",
          term: "term",
          meaning: "meaning",
          pronunciation: null,
          partOfSpeech: null,
          difficulty: "medium" as const,
          example: null,
          exampleTranslation: null,
          note: null,
          tags: [],
          synonyms: null,
          antonyms: null,
          relatedExpressions: null,
          source: null,
          position: 0,
          deletedAt: null,
          createdAt: "2026-04-29T00:00:00Z",
          updatedAt: "2026-04-29T00:00:00Z",
        },
      ],
    };

    expect(toDeckUpsertRow("user-1", payload)).toMatchObject({
      id: "deck-1",
      user_id: "user-1",
      accent_color: payload.deck.accentColor,
    });
    expect(toCardUpsertRows("user-1", payload)[0]).toMatchObject({
      deck_id: "deck-1",
      user_id: "user-1",
    });
  });
});
