import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";
import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { PendingSyncRepository } from "@/src/core/repositories/contracts/PendingSyncRepository";
import type { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";
import { SupabaseDeckGateway } from "@/src/core/repositories/supabase/SupabaseDeckGateway";
import { SupabaseStudyGateway } from "@/src/core/repositories/supabase/SupabaseStudyGateway";
import { DeckSyncMerger } from "@/src/core/services/DeckSyncMerger";
import {
  DeckSyncOperationHandler,
  PendingSyncWorker,
  ReviewLogSyncOperationHandler,
  UserCardStateSyncOperationHandler,
} from "@/src/core/services/PendingSyncWorker";
import { SyncService } from "@/src/core/services/SyncService";
import type { AuthService } from "@/src/core/services/auth/AuthService";

export function createSyncServices(input: {
  appMeta: AppMetaStore;
  authService: AuthService;
  deckRepository: DeckRepository;
  pendingSyncRepository: PendingSyncRepository;
  studyRepository: StudyRepository;
  supabaseClient: SupabaseClient | null;
}) {
  if (!input.supabaseClient) {
    return { deckSyncService: null as SyncService | null };
  }

  const remoteDeckGateway = new SupabaseDeckGateway(input.supabaseClient);
  const remoteStudyGateway = new SupabaseStudyGateway(input.supabaseClient);
  const worker = new PendingSyncWorker(
    input.pendingSyncRepository,
    [
      new DeckSyncOperationHandler(input.deckRepository, remoteDeckGateway),
      new ReviewLogSyncOperationHandler(input.studyRepository, remoteStudyGateway),
      new UserCardStateSyncOperationHandler(input.studyRepository, remoteStudyGateway),
    ],
    input.authService,
  );

  return {
    deckSyncService: new SyncService({
      worker,
      merger: new DeckSyncMerger(input.deckRepository),
      remote: remoteDeckGateway,
      auth: input.authService,
      appMeta: input.appMeta,
    }) as SyncService | null,
  };
}
