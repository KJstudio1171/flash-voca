import type { SyncTrigger } from "@/src/core/services/SyncService";

export interface SyncPolicyDecision {
  continuePullAfterPushFailure: boolean;
}

export function getSyncPolicy(_trigger: SyncTrigger): SyncPolicyDecision {
  return {
    continuePullAfterPushFailure: false,
  };
}
