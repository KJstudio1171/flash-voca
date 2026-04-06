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
  {
    id: "deck_toeic_core",
    ownerId: null,
    title: "TOEIC Core 300",
    description: "Starter official deck for exam-focused vocabulary drills.",
    sourceType: "official",
    accentColor: "#EA580C",
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
  {
    id: "card_allocate",
    deckId: "deck_toeic_core",
    term: "allocate",
    meaning: "assign for a purpose",
    example: "The manager allocated extra budget to the project.",
    note: null,
    position: 0,
  },
  {
    id: "card_invoice",
    deckId: "deck_toeic_core",
    term: "invoice",
    meaning: "invoice",
    example: "Please submit the invoice by Friday.",
    note: null,
    position: 1,
  },
] as const;

const sampleBundle = {
  id: "bundle_exam_starter",
  title: "Exam Starter Pack",
  description: "Sample paid bundle wired to the local catalog and entitlement cache.",
  priceText: "$4.99",
  currencyCode: "USD",
  coverColor: "#EA580C",
};

const sampleBundleItems = [
  {
    id: "bundle_item_exam_starter_1",
    bundleId: "bundle_exam_starter",
    deckId: "deck_toeic_core",
    position: 0,
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
            id, owner_id, title, description, source_type, accent_color, is_deleted, sync_state, last_synced_at, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, 'synced', ?, ?, ?);
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
            id, deck_id, term, meaning, example, note, position, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
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

    await tx.runAsync(
      `
        INSERT INTO bundles (
          id, title, description, price_text, currency_code, cover_color, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          price_text = excluded.price_text,
          currency_code = excluded.currency_code,
          cover_color = excluded.cover_color,
          updated_at = excluded.updated_at;
      `,
      [
        sampleBundle.id,
        sampleBundle.title,
        sampleBundle.description,
        sampleBundle.priceText,
        sampleBundle.currencyCode,
        sampleBundle.coverColor,
        now,
        now,
      ],
    );

    for (const item of sampleBundleItems) {
      await tx.runAsync(
        `
          INSERT INTO bundle_items (id, bundle_id, deck_id, position)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            bundle_id = excluded.bundle_id,
            deck_id = excluded.deck_id,
            position = excluded.position;
        `,
        [item.id, item.bundleId, item.deckId, item.position],
      );
    }
  });
}
