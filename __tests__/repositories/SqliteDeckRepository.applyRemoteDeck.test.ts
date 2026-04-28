import { mergeRemoteDeckIntoTx } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

type RunCall = { sql: string; params: unknown[] };

function createMockTx() {
  const calls: RunCall[] = [];
  return {
    calls,
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
    }),
  };
}

const samplePayload: RemoteDeckPayload = {
  deck: {
    id: "deck_x",
    title: "X",
    description: null,
    accentColor: "#0F766E",
    visibility: "private",
    sourceLanguage: "en",
    targetLanguage: "ko",
    deletedAt: null,
    createdAt: "2026-04-28T00:00:00Z",
    updatedAt: "2026-04-28T00:00:00Z",
  },
  cards: [
    {
      id: "card_a",
      deckId: "deck_x",
      term: "hi",
      meaning: "안녕",
      pronunciation: null,
      partOfSpeech: null,
      difficulty: "medium",
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
      createdAt: "2026-04-28T00:00:00Z",
      updatedAt: "2026-04-28T00:00:00Z",
    },
  ],
};

describe("mergeRemoteDeckIntoTx", () => {
  it("upserts deck, deletes existing cards, inserts new cards", async () => {
    const tx = createMockTx();
    await mergeRemoteDeckIntoTx(
      tx as unknown as Parameters<typeof mergeRemoteDeckIntoTx>[0],
      "user-1",
      samplePayload,
    );

    const sqls = tx.calls.map((c) => c.sql);
    expect(sqls.some((s) => s.includes("INSERT INTO local_decks"))).toBe(true);
    expect(sqls.some((s) => s.includes("DELETE FROM local_deck_cards"))).toBe(true);
    expect(sqls.some((s) => s.includes("INSERT INTO local_deck_cards"))).toBe(true);
  });

  it("marks deck deleted (is_deleted=1) when payload has deletedAt", async () => {
    const tx = createMockTx();
    const payload = {
      ...samplePayload,
      deck: { ...samplePayload.deck, deletedAt: "2026-04-28T00:00:00Z" },
    };
    await mergeRemoteDeckIntoTx(
      tx as unknown as Parameters<typeof mergeRemoteDeckIntoTx>[0],
      "user-1",
      payload,
    );

    const deckUpsertCall = tx.calls.find((c) =>
      c.sql.includes("INSERT INTO local_decks"),
    );
    expect(deckUpsertCall).toBeTruthy();
    expect(deckUpsertCall!.params).toEqual(expect.arrayContaining([1]));
  });
});
