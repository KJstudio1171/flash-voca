import { initI18next, i18next } from "@/src/shared/i18n";
import type { LanguageCode } from "@/src/shared/i18n";

export async function setupI18nForTest(locale: LanguageCode = "ko"): Promise<void> {
  await initI18next(locale);
  if (i18next.language !== locale) {
    await i18next.changeLanguage(locale);
  }
}
