import { getDatabaseAsync } from "@/src/core/database/client";

export interface KeyValueStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  getMany(keys: readonly string[]): Promise<Map<string, string>>;
}

export class SqliteKeyValueStore implements KeyValueStore {
  async get(key: string): Promise<string | undefined> {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = ?`,
      key,
    );
    return row?.value;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      key,
      value,
    );
  }

  async getMany(keys: readonly string[]): Promise<Map<string, string>> {
    if (keys.length === 0) return new Map();
    const db = await getDatabaseAsync();
    const placeholders = keys.map(() => "?").join(", ");
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM app_meta WHERE key IN (${placeholders})`,
      ...keys,
    );
    return new Map(rows.map((r) => [r.key, r.value]));
  }
}
