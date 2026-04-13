import { BootstrapError } from "@/src/core/errors";
import { initializeDatabaseAsync } from "@/src/core/database/initialize";
import { seedMvpDataAsync } from "@/src/core/database/seed";
import { initI18next } from "@/src/shared/i18n/i18nInstance";
import { LocaleService } from "@/src/shared/i18n/LocaleService";

export class BootstrapService {
  constructor(private readonly localeService: LocaleService) {}

  async prepareAppAsync() {
    try {
      const initialLocale = await this.localeService.resolveInitialLocale();
      await Promise.all([
        initI18next(initialLocale),
        (async () => {
          await initializeDatabaseAsync();
          await seedMvpDataAsync();
        })(),
      ]);
    } catch (error) {
      if (error instanceof BootstrapError) {
        throw error;
      }
      throw new BootstrapError({ cause: error });
    }
  }
}
