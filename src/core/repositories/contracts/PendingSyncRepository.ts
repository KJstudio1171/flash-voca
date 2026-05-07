import type {
  SyncEntityType,
  SyncOperationType,
} from "@/src/core/database/types";

export interface PendingSyncOperation {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: unknown;
  attemptCount: number;
  availableAt: string;
}

export interface PendingSyncRepository {
  listPendingOperationsAsync(
    entityTypes: SyncEntityType[],
  ): Promise<PendingSyncOperation[]>;
  markProcessingAsync(opId: string): Promise<void>;
  deleteAsync(opId: string): Promise<void>;
  markFailedAsync(
    opId: string,
    error: { message: string; permanent: boolean },
    nextAvailableAt: string,
    nextAttemptCount: number,
  ): Promise<void>;
  countFailedAsync(entityTypes?: SyncEntityType[]): Promise<number>;
}
