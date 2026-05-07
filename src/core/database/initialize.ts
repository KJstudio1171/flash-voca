import { getDatabaseAsync } from "@/src/core/database/client";
import { LOCAL_DATABASE_SCHEMA_SQL } from "@/src/core/database/schema";

export const LOCAL_DATABASE_SCHEMA_VERSION = 9;

const SQLITE_PRAGMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
`;

type MigrationDatabase = Awaited<ReturnType<typeof getDatabaseAsync>>;

async function hasColumnAsync(
  db: MigrationDatabase,
  tableName: string,
  columnName: string,
) {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  return rows.some((row) => row.name === columnName);
}

async function addColumnIfMissingAsync(
  db: MigrationDatabase,
  tableName: string,
  columnName: string,
  columnSql: string,
) {
  if (await hasColumnAsync(db, tableName, columnName)) {
    return;
  }
  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql};`);
}

async function migrateToVersion3Async(db: MigrationDatabase) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      "DELETE FROM bundle_items WHERE bundle_id = ?;",
      ["bundle_exam_starter"],
    );
    await tx.runAsync("DELETE FROM bundles WHERE id = ?;", ["bundle_exam_starter"]);
    await tx.runAsync("DELETE FROM local_deck_cards WHERE deck_id = ?;", [
      "deck_toeic_core",
    ]);
    await tx.runAsync("DELETE FROM local_decks WHERE id = ? AND source_type = 'official';", [
      "deck_toeic_core",
    ]);
  });
}

async function migrateToVersion4Async(db: MigrationDatabase) {
  await addColumnIfMissingAsync(
    db,
    "local_decks",
    "visibility",
    "visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public'))",
  );
  await addColumnIfMissingAsync(
    db,
    "local_decks",
    "source_language",
    "source_language TEXT NOT NULL DEFAULT 'en'",
  );
  await addColumnIfMissingAsync(
    db,
    "local_decks",
    "target_language",
    "target_language TEXT NOT NULL DEFAULT 'ko'",
  );
  await addColumnIfMissingAsync(db, "local_deck_cards", "pronunciation", "pronunciation TEXT");
  await addColumnIfMissingAsync(db, "local_deck_cards", "part_of_speech", "part_of_speech TEXT");
  await addColumnIfMissingAsync(
    db,
    "local_deck_cards",
    "difficulty",
    "difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'))",
  );
  await addColumnIfMissingAsync(
    db,
    "local_deck_cards",
    "example_translation",
    "example_translation TEXT",
  );
  await addColumnIfMissingAsync(
    db,
    "local_deck_cards",
    "tags",
    "tags TEXT NOT NULL DEFAULT '[]'",
  );
  await addColumnIfMissingAsync(db, "local_deck_cards", "synonyms", "synonyms TEXT");
  await addColumnIfMissingAsync(db, "local_deck_cards", "antonyms", "antonyms TEXT");
  await addColumnIfMissingAsync(
    db,
    "local_deck_cards",
    "related_expressions",
    "related_expressions TEXT",
  );
  await addColumnIfMissingAsync(db, "local_deck_cards", "source", "source TEXT");
  await addColumnIfMissingAsync(db, "local_deck_cards", "image_uri", "image_uri TEXT");
}

async function migrateToVersion5Async(db: MigrationDatabase) {
  await addColumnIfMissingAsync(
    db,
    "local_user_card_states",
    "is_bookmarked",
    "is_bookmarked INTEGER NOT NULL DEFAULT 0",
  );
}

async function migrateToVersion6Async(db: MigrationDatabase) {
  await addColumnIfMissingAsync(db, "bundles", "play_product_id", "play_product_id TEXT");
}

async function migrateToVersion7Async(db: MigrationDatabase): Promise<void> {
  await addColumnIfMissingAsync(
    db,
    "local_user_card_states",
    "algorithm_data",
    "algorithm_data TEXT NOT NULL DEFAULT '{}'",
  );
}

async function migrateToVersion8Async(db: MigrationDatabase): Promise<void> {
  await addColumnIfMissingAsync(
    db,
    "cached_entitlements",
    "kind",
    "kind TEXT NOT NULL DEFAULT 'one_time'",
  );
  await addColumnIfMissingAsync(
    db,
    "cached_entitlements",
    "auto_renewing",
    "auto_renewing INTEGER NOT NULL DEFAULT 0",
  );
}

async function migrateToVersion9Async(db: MigrationDatabase): Promise<void> {
  await addColumnIfMissingAsync(
    db,
    "local_review_logs",
    "previous_srs_state",
    "previous_srs_state TEXT NOT NULL DEFAULT '{}'",
  );
  await addColumnIfMissingAsync(
    db,
    "local_review_logs",
    "next_srs_state",
    "next_srs_state TEXT NOT NULL DEFAULT '{}'",
  );
}

export async function initializeDatabaseAsync() {
  const db = await getDatabaseAsync();

  await db.execAsync(SQLITE_PRAGMA_SQL);
  await db.execAsync(LOCAL_DATABASE_SCHEMA_SQL);

  const versionRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schema_version';",
  );
  const currentVersion = Number(versionRow?.value ?? 0);

  if (currentVersion >= LOCAL_DATABASE_SCHEMA_VERSION) {
    return;
  }

  // Bump schema_version after each step so a crash mid-chain doesn't leave us
  // re-running already-applied migrations on next launch.
  const steps: [number, () => Promise<void>][] = [
    [3, () => migrateToVersion3Async(db)],
    [4, () => migrateToVersion4Async(db)],
    [5, () => migrateToVersion5Async(db)],
    [6, () => migrateToVersion6Async(db)],
    [7, () => migrateToVersion7Async(db)],
    [8, () => migrateToVersion8Async(db)],
    [9, () => migrateToVersion9Async(db)],
  ];
  for (const [version, run] of steps) {
    if (currentVersion < version) {
      await run();
      await setSchemaVersionAsync(db, version);
    }
  }
}

async function setSchemaVersionAsync(db: MigrationDatabase, version: number) {
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    [String(version)],
  );
}
