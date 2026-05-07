import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";
import type {
  RemoteDeckGateway,
  RemoteDeckPayload,
  RemoteDeckPullCursor,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import { PendingSyncWorker } from "@/src/core/services/PendingSyncWorker";
import { getSyncPolicy } from "@/src/core/services/sync/SyncPolicy";

const PAGE_SIZE = 200;
const LAST_PULLED_KEY = "deck_sync.last_pulled_at";

export type SyncTrigger = "bootstrap" | "manual";

export interface SyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  durationMs: number;
}

export interface SyncDeps {
  worker: PendingSyncWorker;
  merger: DeckSyncMerger;
  remote: RemoteDeckGateway;
  auth: AuthService;
  appMeta: AppMetaStore;
}

function getNextPullCursor(batch: RemoteDeckPayload[]): RemoteDeckPullCursor {
  const last = batch[batch.length - 1].deck;
  return { updatedAt: last.updatedAt, id: last.id };
}

function parseCursor(stored: string | null): RemoteDeckPullCursor | null {
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.updatedAt === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
  } catch {
    // legacy format: bare ISO timestamp. Treat id as empty so the first
    // boundary record (id > "") is still picked up on the next page.
  }
  return { updatedAt: stored, id: "" };
}

export class SyncService {
  constructor(private readonly deps: SyncDeps) {}

  async syncAsync(input: { trigger: SyncTrigger }): Promise<SyncResult> {
    const policy = getSyncPolicy(input.trigger);
    const startedAt = Date.now();
    const userId = this.deps.auth.getCurrentUserId();

    const flush = await this.deps.worker.flushOperationsAsync();
    if (flush.failed > 0 && !policy.continuePullAfterPushFailure) {
      return {
        pushed: flush.succeeded,
        pulled: 0,
        failed: flush.failed,
        durationMs: Date.now() - startedAt,
      };
    }

    let cursor = parseCursor(await this.deps.appMeta.getValueAsync(LAST_PULLED_KEY));
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

      cursor = getNextPullCursor(batch);
      await this.deps.appMeta.setValueAsync(LAST_PULLED_KEY, JSON.stringify(cursor));

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
