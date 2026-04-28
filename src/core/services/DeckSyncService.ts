import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";
import type { RemoteDeckGateway } from "@/src/core/repositories/contracts/RemoteDeckGateway";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";

const PAGE_SIZE = 200;
const LAST_PULLED_KEY = "deck_sync.last_pulled_at";

export type SyncTrigger = "bootstrap" | "manual";

export interface DeckSyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  durationMs: number;
}

export interface DeckSyncDeps {
  worker: PendingSyncWorker;
  merger: DeckSyncMerger;
  remote: RemoteDeckGateway;
  auth: AuthService;
  appMeta: AppMetaStore;
}

export class DeckSyncService {
  constructor(private readonly deps: DeckSyncDeps) {}

  async syncAsync(input: { trigger: SyncTrigger }): Promise<DeckSyncResult> {
    void input.trigger;
    const startedAt = Date.now();
    const userId = this.deps.auth.getCurrentUserId();

    const flush = await this.deps.worker.flushDeckOperationsAsync();

    let cursor = await this.deps.appMeta.getValueAsync(LAST_PULLED_KEY);
    let pulledTotal = 0;

    while (true) {
      const batch = await this.deps.remote.pullDecksUpdatedAfterAsync(
        userId,
        cursor,
        PAGE_SIZE,
      );
      if (batch.length === 0) break;

      await this.deps.merger.mergePulledAsync(batch);
      pulledTotal += batch.length;

      cursor = batch[batch.length - 1].deck.updatedAt;
      await this.deps.appMeta.setValueAsync(LAST_PULLED_KEY, cursor);

      if (batch.length < PAGE_SIZE) break;
    }

    return {
      pushed: flush.succeeded,
      pulled: pulledTotal,
      failed: flush.failed,
      durationMs: Date.now() - startedAt,
    };
  }
}
