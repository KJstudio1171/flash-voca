import { createMockDeckCard } from "@/__tests__/helpers/factories";

import {
  createEmptyEditableCard,
  joinTags,
  splitTags,
  toEditableCards,
} from "@/src/features/decks/utils/deckEditing";

describe("deckEditing", () => {
  it("preserves extended card fields when converting cards for save payloads", () => {
    const card = createMockDeckCard({
      pronunciation: "[test]",
      partOfSpeech: "명사",
      difficulty: "hard",
      example: "A test example.",
      exampleTranslation: "테스트 예문입니다.",
      note: "memo",
      tags: ["토익", "중요"],
      synonyms: "trial",
      antonyms: "certainty",
      relatedExpressions: "test case",
      source: "manual",
      imageUri: "file://image.png",
      position: 5,
    });

    expect(toEditableCards([card])).toEqual([
      expect.objectContaining({
        id: card.id,
        pronunciation: "[test]",
        partOfSpeech: "명사",
        difficulty: "hard",
        exampleTranslation: "테스트 예문입니다.",
        tags: ["토익", "중요"],
        synonyms: "trial",
        antonyms: "certainty",
        relatedExpressions: "test case",
        source: "manual",
        imageUri: "file://image.png",
        position: 0,
      }),
    ]);
  });

  it("creates new cards with the required defaults", () => {
    expect(createEmptyEditableCard(3)).toEqual(
      expect.objectContaining({
        term: "",
        meaning: "",
        pronunciation: null,
        partOfSpeech: null,
        difficulty: "medium",
        tags: [],
        position: 3,
      }),
    );
  });

  it("normalizes comma separated tags", () => {
    expect(splitTags(" 비즈니스, 토익,, 중요 ")).toEqual(["비즈니스", "토익", "중요"]);
    expect(joinTags(["비즈니스", "토익"])).toBe("비즈니스, 토익");
  });
});
