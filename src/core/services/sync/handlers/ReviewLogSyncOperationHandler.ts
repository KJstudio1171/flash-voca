import type { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";
import type { PendingSyncOperation } from "@/src/core/repositories/contracts/PendingSyncRepository";
import type {
  RemoteReviewLogPayload,
  RemoteStudyGateway,
} from "@/src/core/repositories/contracts/RemoteStudyGateway";
import type { PendingSyncOperationHandler } from "@/src/core/services/sync/PendingSyncOperationHandler";

export class ReviewLogSyncOperationHandler implements PendingSyncOperationHandler {
  readonly entityType = "review_log" as const;

  constructor(
    private readonly studyRepo: StudyRepository,
    private readonly remote: RemoteStudyGateway,
  ) {}

  async pushAsync(op: PendingSyncOperation, userId: string): Promise<void> {
    if (op.operationType === "delete") {
      await this.remote.deleteReviewLogAsync(userId, op.entityId);
      return;
    }

    await this.remote.upsertReviewLogAsync(
      userId,
      op.payload as RemoteReviewLogPayload,
    );
  }

  async afterSuccessAsync(op: PendingSyncOperation): Promise<void> {
    if (op.operationType === "upsert") {
      await this.studyRepo.markReviewLogSyncedAsync(op.entityId);
    }
  }
}
