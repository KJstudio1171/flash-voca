import * as Localization from "expo-localization";

export interface LocaleDetector {
  detectDeviceLocale(): string | null;
}

export class ExpoLocaleDetector implements LocaleDetector {
  detectDeviceLocale(): string | null {
    const locales = Localization.getLocales();
    return locales[0]?.languageCode ?? null;
  }
}
