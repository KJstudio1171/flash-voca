import i18next, { i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { FALLBACK_CHAIN, LanguageCode, SUPPORTED_LOCALES } from "@/src/shared/i18n/config";
import en from "@/src/shared/i18n/locales/en.json";
import ja from "@/src/shared/i18n/locales/ja.json";
import ko from "@/src/shared/i18n/locales/ko.json";
import zh from "@/src/shared/i18n/locales/zh.json";

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
} as const;

export async function initI18next(initialLocale: LanguageCode): Promise<I18nInstance> {
  if (i18next.isInitialized) {
    if (i18next.language !== initialLocale) {
      await i18next.changeLanguage(initialLocale);
    }
    return i18next;
  }

  await i18next.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: [...FALLBACK_CHAIN],
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return i18next;
}

export { i18next };
