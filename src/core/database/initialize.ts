import { getDatabaseAsync } from "@/src/core/database/client";
import { LOCAL_DATABASE_SCHEMA_SQL } from "@/src/core/database/schema";

export const LOCAL_DATABASE_SCHEMA_VERSION = 3;

const SQLITE_PRAGMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
`;

type MigrationDatabase = Awaited<ReturnType<typeof getDatabaseAsync>>;

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

  if (currentVersion < 3) {
    await migrateToVersion3Async(db);
  }

  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    [String(LOCAL_DATABASE_SCHEMA_VERSION)],
  );
}
