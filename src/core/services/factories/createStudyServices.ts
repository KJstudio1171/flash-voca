import type { SqliteAppMetaRepository } from "@/src/core/repositories/sqlite/SqliteAppMetaRepository";
import type { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import type { SqliteStudyRepository } from "@/src/core/repositories/sqlite/SqliteStudyRepository";
import { StudySessionService } from "@/src/core/services/StudySessionService";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";

export function createStudyServices(input: {
  appMeta: SqliteAppMetaRepository;
  authService: AuthService;
  deckRepository: SqliteDeckRepository;
  studyRepository: SqliteStudyRepository;
}) {
  const srsPreferenceService = new SrsPreferenceService(input.appMeta);

  return {
    studySessionService: new StudySessionService(
      input.deckRepository,
      input.studyRepository,
      input.authService,
      srsPreferenceService,
    ),
    srsPreferenceService,
  };
}
