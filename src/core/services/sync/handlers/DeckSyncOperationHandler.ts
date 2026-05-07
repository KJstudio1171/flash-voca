import { SyncError } from "@/src/core/errors";
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { PendingSyncOperation } from "@/src/core/repositories/contracts/PendingSyncRepository";
import type {
  RemoteDeckGateway,
  RemoteDeckPayload,
} from "@/src/core/repositories/contracts/RemoteDeckGateway";
import type { PendingSyncOperationHandler } from "@/src/core/services/sync/PendingSyncOperationHandler";

function isRemoteDeckPayload(value: unknown): value is RemoteDeckPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RemoteDeckPayload>;
  if (!v.deck || typeof v.deck !== "object") return false;
  if (typeof v.deck.id !== "string" || typeof v.deck.updatedAt !== "string") {
    return false;
  }
  return Array.isArray(v.cards);
}

function isSoftDeletePayload(
  value: unknown,
): value is { id: string; deletedAt: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as { id?: unknown; deletedAt?: unknown };
  return typeof v.id === "string" && typeof v.deletedAt === "string";
}

export class DeckSyncOperationHandler implements PendingSyncOperationHandler {
  readonly entityType = "deck" as const;

  constructor(
    private readonly deckRepo: DeckRepository,
    private readonly remote: RemoteDeckGateway,
  ) {}

  async pushAsync(op: PendingSyncOperation, userId: string): Promise<void> {
    if (op.operationType === "upsert") {
      if (!isRemoteDeckPayload(op.payload)) {
        throw new SyncError({
          context: { reason: "invalid_upsert_payload", opId: op.id },
        });
      }
      await this.remote.upsertDeckAsync(userId, op.payload);
      return;
    }

    if (!isSoftDeletePayload(op.payload)) {
      throw new SyncError({
        context: { reason: "invalid_delete_payload", opId: op.id },
      });
    }
    await this.remote.softDeleteDeckAsync(userId, op.payload.id, op.payload.deletedAt);
  }

  async afterSuccessAsync(op: PendingSyncOperation): Promise<void> {
    await this.deckRepo.markDeckSyncedAsync(op.entityId);
  }
}
