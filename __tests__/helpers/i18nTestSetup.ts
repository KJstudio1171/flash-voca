import { initI18next, i18next } from "@/src/shared/i18n/i18nInstance";
import type { LanguageCode } from "@/src/shared/i18n/config";

export async function setupI18nForTest(locale: LanguageCode = "ko"): Promise<void> {
  await initI18next(locale);
  if (i18next.language !== locale) {
    await i18next.changeLanguage(locale);
  }
}
