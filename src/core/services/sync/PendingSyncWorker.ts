import type { SyncEntityType } from "@/src/core/database/types";
import type {
  PendingSyncOperation,
  PendingSyncRepository,
} from "@/src/core/repositories/contracts/PendingSyncRepository";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { PendingSyncOperationHandler } from "@/src/core/services/sync/PendingSyncOperationHandler";
import {
  computeBackoffDate,
  isPermanentSyncFailure,
} from "@/src/core/services/sync/SyncRetryPolicy";

export interface FlushResult {
  succeeded: number;
  failed: number;
}

export class PendingSyncWorker {
  constructor(
    private readonly queue: PendingSyncRepository,
    private readonly handlers: PendingSyncOperationHandler[],
    private readonly auth: AuthService,
  ) {}

  async flushDeckOperationsAsync(): Promise<FlushResult> {
    return this.flushOperationsAsync(["deck"]);
  }

  async flushOperationsAsync(entityTypes?: SyncEntityType[]): Promise<FlushResult> {
    const userId = this.auth.getCurrentUserId();
    const handlerByEntityType = new Map(
      this.handlers.map((handler) => [handler.entityType, handler]),
    );
    const supportedEntityTypes = entityTypes ?? [...handlerByEntityType.keys()];
    const ops = await this.queue.listPendingOperationsAsync(supportedEntityTypes);

    let succeeded = 0;
    let failed = 0;

    for (const op of ops) {
      const handler = handlerByEntityType.get(op.entityType);
      if (!handler) {
        continue;
      }

      try {
        await this.pushOperationAsync(op, handler, userId);
        succeeded++;
      } catch (error) {
        await this.markFailureAsync(op, error);
        failed++;
      }
    }

    return { succeeded, failed };
  }

  private async pushOperationAsync(
    op: PendingSyncOperation,
    handler: PendingSyncOperationHandler,
    userId: string,
  ) {
    await this.queue.markProcessingAsync(op.id);
    await handler.pushAsync(op, userId);
    // Mark the entity as synced before deleting the queue row. If the delete
    // step fails the op will be retried, but the remote write is idempotent
    // so the retry is safe — and we never end up with a deleted queue row
    // and a still-'pending' local entity.
    await handler.afterSuccessAsync?.(op);
    await this.queue.deleteAsync(op.id);
  }

  private async markFailureAsync(op: PendingSyncOperation, error: unknown) {
    const nextAttemptCount = op.attemptCount + 1;
    await this.queue.markFailedAsync(
      op.id,
      {
        message: (error as Error)?.message ?? "unknown",
        permanent: isPermanentSyncFailure(nextAttemptCount),
      },
      computeBackoffDate(nextAttemptCount),
      nextAttemptCount,
    );
  }
}
