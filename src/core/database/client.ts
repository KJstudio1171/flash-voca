import * as SQLite from "expo-sqlite";

import { DATABASE_NAME } from "@/src/core/config/constants";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabaseAsync() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}
