import type { SyncEntityType } from "@/src/core/database/types";
import type { PendingSyncOperation } from "@/src/core/repositories/contracts/PendingSyncRepository";

export interface PendingSyncOperationHandler {
  readonly entityType: SyncEntityType;
  pushAsync(op: PendingSyncOperation, userId: string): Promise<void>;
  afterSuccessAsync?(op: PendingSyncOperation): Promise<void>;
}
