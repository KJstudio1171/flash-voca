import { getDatabaseAsync } from "@/src/core/database/client";
import type { SyncEntityType } from "@/src/core/database/types";
import type {
  PendingSyncOperation,
  PendingSyncRepository,
} from "@/src/core/repositories/contracts/PendingSyncRepository";

function buildEntityFilter(entityTypes?: SyncEntityType[]) {
  if (!entityTypes || entityTypes.length === 0) {
    return { sql: "", params: [] as string[] };
  }

  return {
    sql: ` AND entity_type IN (${entityTypes.map(() => "?").join(", ")})`,
    params: entityTypes,
  };
}

export class SqlitePendingSyncRepository implements PendingSyncRepository {
  async listPendingOperationsAsync(
    entityTypes: SyncEntityType[],
  ): Promise<PendingSyncOperation[]> {
    const db = await getDatabaseAsync();
    const filter = buildEntityFilter(entityTypes);
    const rows = await db.getAllAsync<{
      id: string;
      entity_type: SyncEntityType;
      entity_id: string;
      operation_type: "upsert" | "delete";
      payload: string | null;
      attempt_count: number;
      available_at: string;
    }>(
      `SELECT id, entity_type, entity_id, operation_type, payload, attempt_count, available_at
       FROM pending_sync_operations
       WHERE status = 'pending'
         AND available_at <= ?
         ${filter.sql}
       ORDER BY created_at ASC;`,
      [new Date().toISOString(), ...filter.params],
    );

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operationType: row.operation_type,
      payload: row.payload ? JSON.parse(row.payload) : null,
      attemptCount: row.attempt_count,
      availableAt: row.available_at,
    }));
  }

  async markProcessingAsync(opId: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `UPDATE pending_sync_operations
       SET status = 'processing', updated_at = ?
       WHERE id = ?;`,
      [new Date().toISOString(), opId],
    );
  }

  async deleteAsync(opId: string): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM pending_sync_operations WHERE id = ?;", [opId]);
  }

  async markFailedAsync(
    opId: string,
    error: { message: string; permanent: boolean },
    nextAvailableAt: string,
    nextAttemptCount: number,
  ): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `UPDATE pending_sync_operations
       SET status = ?, attempt_count = ?,
           available_at = ?, last_error = ?, updated_at = ?
       WHERE id = ?;`,
      [
        error.permanent ? "failed" : "pending",
        nextAttemptCount,
        nextAvailableAt,
        error.message,
        new Date().toISOString(),
        opId,
      ],
    );
  }

  async countFailedAsync(entityTypes?: SyncEntityType[]): Promise<number> {
    const db = await getDatabaseAsync();
    const filter = buildEntityFilter(entityTypes);
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM pending_sync_operations
       WHERE status = 'failed'
         ${filter.sql};`,
      filter.params,
    );

    return row?.count ?? 0;
  }
}
