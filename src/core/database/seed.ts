import { LOCAL_USER_ID } from "@/src/core/config/constants";
import { getDatabaseAsync } from "@/src/core/database/client";

const sampleDecks = [
  {
    id: "deck_travel_basics",
    ownerId: LOCAL_USER_ID,
    title: "Travel Basics",
    description: "Useful airport, hotel, and transit vocabulary for a first trip.",
    sourceType: "user",
    accentColor: "#0F766E",
  },
  {
    id: "deck_business_calls",
    ownerId: LOCAL_USER_ID,
    title: "Business Calls",
    description: "Common expressions for scheduling calls and following up with clients.",
    sourceType: "user",
    accentColor: "#1D4ED8",
  },
] as const;

const sampleCards = [
  {
    id: "card_boarding_pass",
    deckId: "deck_travel_basics",
    term: "boarding pass",
    meaning: "boarding pass",
    example: "Please show your boarding pass at the gate.",
    note: "Frequently used during airport check-in and boarding.",
    position: 0,
  },
  {
    id: "card_luggage_claim",
    deckId: "deck_travel_basics",
    term: "baggage claim",
    meaning: "baggage claim area",
    example: "Where is the baggage claim area?",
    note: null,
    position: 1,
  },
  {
    id: "card_confirm_schedule",
    deckId: "deck_business_calls",
    term: "confirm the schedule",
    meaning: "confirm the schedule",
    example: "Can we confirm the schedule by noon?",
    note: "Natural phrase for both email and live calls.",
    position: 0,
  },
  {
    id: "card_follow_up",
    deckId: "deck_business_calls",
    term: "follow up",
    meaning: "take follow-up action",
    example: "I'll follow up with the client tomorrow.",
    note: null,
    position: 1,
  },
] as const;

export async function seedMvpDataAsync() {
  const db = await getDatabaseAsync();
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (tx) => {
    const deckCountRow = await tx.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM local_decks;",
    );

    if ((deckCountRow?.count ?? 0) > 0) {
      return;
    }

    for (const deck of sampleDecks) {
      await tx.runAsync(
        `
          INSERT INTO local_decks (
            id, owner_id, title, description, source_type, accent_color, visibility, source_language, target_language, is_deleted, sync_state, last_synced_at, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 'private', 'en', 'ko', 0, 'synced', ?, ?, ?);
        `,
        [
          deck.id,
          deck.ownerId,
          deck.title,
          deck.description,
          deck.sourceType,
          deck.accentColor,
          now,
          now,
          now,
        ],
      );
    }

    for (const card of sampleCards) {
      await tx.runAsync(
        `
          INSERT INTO local_deck_cards (
            id, deck_id, term, meaning, pronunciation, part_of_speech, difficulty, example, example_translation, note, tags, synonyms, antonyms, related_expressions, source, image_uri, position, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, NULL, NULL, 'medium', ?, NULL, ?, '[]', NULL, NULL, NULL, NULL, NULL, ?, ?, ?);
        `,
        [
          card.id,
          card.deckId,
          card.term,
          card.meaning,
          card.example,
          card.note,
          card.position,
          now,
          now,
        ],
      );
    }
  });
}
