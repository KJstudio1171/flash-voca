import type {
  SQLiteBindParams,
  SQLiteRunResult,
} from "expo-sqlite";

import {
  SyncEntityType,
  SyncOperationType,
} from "@/src/core/database/types";
import { createId } from "@/src/shared/utils/createId";

interface SqliteMutationRunner {
  runAsync(sql: string, params: SQLiteBindParams): Promise<SQLiteRunResult>;
}

interface QueuePendingSyncOperationInput {
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload?: unknown;
}

export async function enqueuePendingSyncOperationAsync(
  db: SqliteMutationRunner,
  input: QueuePendingSyncOperationInput,
) {
  const now = new Date().toISOString();
  const dedupeKey = `${input.entityType}:${input.entityId}:${input.operationType}`;
  const payload = input.payload == null ? null : JSON.stringify(input.payload);

  await db.runAsync(
    `
      INSERT INTO pending_sync_operations (
        id, dedupe_key, entity_type, entity_id, operation_type, payload, status, attempt_count, available_at, last_error, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL, ?, ?)
      ON CONFLICT(dedupe_key) DO UPDATE SET
        payload = excluded.payload,
        status = excluded.status,
        attempt_count = 0,
        available_at = excluded.available_at,
        last_error = NULL,
        updated_at = excluded.updated_at;
    `,
    [
      createId("syncop"),
      dedupeKey,
      input.entityType,
      input.entityId,
      input.operationType,
      payload,
      now,
      now,
      now,
    ],
  );
}
