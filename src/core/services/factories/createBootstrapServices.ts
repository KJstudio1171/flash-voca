import { BootstrapService } from "@/src/core/services/BootstrapService";
import {
  AsyncStorageLocaleStorage,
  ExpoLocaleDetector,
  LocaleService,
} from "@/src/shared/i18n";

export function createBootstrapServices() {
  const localeService = new LocaleService(
    new AsyncStorageLocaleStorage(),
    new ExpoLocaleDetector(),
  );

  return {
    bootstrapService: new BootstrapService(),
    localeService,
  };
}
