import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface MergeRemoteDeckTx {
  runAsync(sql: string, params: unknown[]): Promise<unknown>;
}

export async function mergeRemoteDeckIntoTx(
  tx: MergeRemoteDeckTx,
  ownerId: string,
  payload: RemoteDeckPayload,
): Promise<void> {
  const isDeleted = payload.deck.deletedAt ? 1 : 0;
  const now = new Date().toISOString();

  await tx.runAsync(
    `INSERT INTO local_decks (
      id, owner_id, title, description, source_type, accent_color,
      visibility, source_language, target_language, is_deleted,
      sync_state, last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      accent_color = excluded.accent_color,
      visibility = excluded.visibility,
      source_language = excluded.source_language,
      target_language = excluded.target_language,
      is_deleted = excluded.is_deleted,
      sync_state = 'synced',
      last_synced_at = excluded.last_synced_at,
      updated_at = excluded.updated_at;`,
    [
      payload.deck.id,
      ownerId,
      payload.deck.title,
      payload.deck.description,
      payload.deck.accentColor,
      payload.deck.visibility,
      payload.deck.sourceLanguage,
      payload.deck.targetLanguage,
      isDeleted,
      now,
      payload.deck.createdAt,
      payload.deck.updatedAt,
    ],
  );

  // Delete only cards that no longer exist in the payload so locally-stored
  // image_uri values on still-present cards are preserved across pulls.
  const keepIds = payload.cards.filter((c) => !c.deletedAt).map((c) => c.id);
  if (keepIds.length === 0) {
    await tx.runAsync("DELETE FROM local_deck_cards WHERE deck_id = ?;", [
      payload.deck.id,
    ]);
  } else {
    const placeholders = keepIds.map(() => "?").join(",");
    await tx.runAsync(
      `DELETE FROM local_deck_cards WHERE deck_id = ? AND id NOT IN (${placeholders});`,
      [payload.deck.id, ...keepIds],
    );
  }

  for (const card of payload.cards) {
    if (card.deletedAt) continue;
    await tx.runAsync(
      `INSERT INTO local_deck_cards (
        id, deck_id, term, meaning, pronunciation, part_of_speech, difficulty,
        example, example_translation, note, tags, synonyms, antonyms,
        related_expressions, source, image_uri, position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        deck_id = excluded.deck_id,
        term = excluded.term,
        meaning = excluded.meaning,
        pronunciation = excluded.pronunciation,
        part_of_speech = excluded.part_of_speech,
        difficulty = excluded.difficulty,
        example = excluded.example,
        example_translation = excluded.example_translation,
        note = excluded.note,
        tags = excluded.tags,
        synonyms = excluded.synonyms,
        antonyms = excluded.antonyms,
        related_expressions = excluded.related_expressions,
        source = excluded.source,
        position = excluded.position,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;`,
      [
        card.id,
        card.deckId,
        card.term,
        card.meaning,
        card.pronunciation,
        card.partOfSpeech,
        card.difficulty,
        card.example,
        card.exampleTranslation,
        card.note,
        JSON.stringify(card.tags),
        card.synonyms,
        card.antonyms,
        card.relatedExpressions,
        card.source,
        card.position,
        card.createdAt,
        card.updatedAt,
      ],
    );
  }
}
