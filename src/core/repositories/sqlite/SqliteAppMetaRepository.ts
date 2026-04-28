import { getDatabaseAsync } from "@/src/core/database/client";
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";

export class SqliteAppMetaRepository implements AppMetaStore {
  async getValueAsync(key: string): Promise<string | null> {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ value: string | null }>(
      "SELECT value FROM app_meta WHERE key = ?;",
      [key],
    );
    return row?.value ?? null;
  }

  async setValueAsync(key: string, value: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, value],
    );
  }
}
