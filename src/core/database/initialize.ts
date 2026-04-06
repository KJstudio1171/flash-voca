import { getDatabaseAsync } from "@/src/core/database/client";
import { LOCAL_DATABASE_SCHEMA_SQL } from "@/src/core/database/schema";

export const LOCAL_DATABASE_SCHEMA_VERSION = 2;

const SQLITE_PRAGMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
`;

export async function initializeDatabaseAsync() {
  const db = await getDatabaseAsync();

  await db.execAsync(SQLITE_PRAGMA_SQL);
  await db.execAsync(LOCAL_DATABASE_SCHEMA_SQL);

  const versionRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schema_version';",
  );

  if (Number(versionRow?.value ?? 0) >= LOCAL_DATABASE_SCHEMA_VERSION) {
    return;
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
