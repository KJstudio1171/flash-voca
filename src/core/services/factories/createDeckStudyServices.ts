import type { SqliteAppMetaRepository } from "@/src/core/repositories/sqlite/SqliteAppMetaRepository";
import type { SqliteDeckRepository } from "@/src/core/repositories/sqlite/SqliteDeckRepository";
import type { SqliteStudyRepository } from "@/src/core/repositories/sqlite/SqliteStudyRepository";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import { createDeckServices } from "@/src/core/services/factories/createDeckServices";
import { createStudyServices } from "@/src/core/services/factories/createStudyServices";

export function createDeckStudyServices(input: {
  appMeta: SqliteAppMetaRepository;
  authService: AuthService;
  deckRepository: SqliteDeckRepository;
  studyRepository: SqliteStudyRepository;
}) {
  const deck = createDeckServices({ deckRepository: input.deckRepository });
  const study = createStudyServices(input);

  return {
    ...deck,
    ...study,
  };
}
