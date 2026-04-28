import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type {
  RemoteDeckGateway,
  RemoteDeckPayload,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface FlushResult {
  succeeded: number;
  failed: number;
}

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_SECONDS = 30;
const BACKOFF_CAP_SECONDS = 3600;

function computeBackoffDate(attemptCountAfter: number): string {
  const seconds = Math.min(
    BACKOFF_BASE_SECONDS * 2 ** (attemptCountAfter - 1),
    BACKOFF_CAP_SECONDS,
  );
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export class PendingSyncWorker {
  constructor(
    private readonly deckRepo: DeckRepository,
    private readonly remote: RemoteDeckGateway,
    private readonly auth: AuthService,
  ) {}

  async flushDeckOperationsAsync(): Promise<FlushResult> {
    const userId = this.auth.getCurrentUserId();
    const ops = await this.deckRepo.listPendingDeckOpsAsync();

    let succeeded = 0;
    let failed = 0;

    for (const op of ops) {
      try {
        await this.deckRepo.markOpProcessingAsync(op.id);
        if (op.operationType === "upsert") {
          await this.remote.upsertDeckAsync(userId, op.payload as RemoteDeckPayload);
        } else {
          const del = op.payload as { id: string; deletedAt: string };
          await this.remote.softDeleteDeckAsync(userId, del.id, del.deletedAt);
        }
        await this.deckRepo.deleteOpAsync(op.id);
        await this.deckRepo.markDeckSyncedAsync(op.entityId);
        succeeded++;
      } catch (error) {
        const attemptAfter = op.attemptCount + 1;
        const permanent = attemptAfter >= MAX_ATTEMPTS;
        await this.deckRepo.markOpFailedAsync(
          op.id,
          {
            message: (error as Error)?.message ?? "unknown",
            permanent,
          },
          computeBackoffDate(attemptAfter),
        );
        failed++;
      }
    }

    return { succeeded, failed };
  }
}
