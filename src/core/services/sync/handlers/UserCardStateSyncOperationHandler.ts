import type { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";
import type { PendingSyncOperation } from "@/src/core/repositories/contracts/PendingSyncRepository";
import type {
  RemoteStudyGateway,
  RemoteUserCardStatePayload,
} from "@/src/core/repositories/contracts/RemoteStudyGateway";
import type { PendingSyncOperationHandler } from "@/src/core/services/sync/PendingSyncOperationHandler";

export class UserCardStateSyncOperationHandler implements PendingSyncOperationHandler {
  readonly entityType = "user_card_state" as const;

  constructor(
    private readonly studyRepo: StudyRepository,
    private readonly remote: RemoteStudyGateway,
  ) {}

  async pushAsync(op: PendingSyncOperation, userId: string): Promise<void> {
    if (op.operationType === "delete") {
      return;
    }

    await this.remote.upsertUserCardStateAsync(
      userId,
      op.payload as RemoteUserCardStatePayload,
    );
  }

  async afterSuccessAsync(op: PendingSyncOperation): Promise<void> {
    if (op.operationType === "upsert") {
      await this.studyRepo.markUserCardStateSyncedAsync(op.entityId);
    }
  }
}
