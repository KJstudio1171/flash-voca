export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_CHAIN,
  isSupportedLocale,
} from "@/src/shared/i18n/config";
export type { LanguageCode } from "@/src/shared/i18n/config";
export type { TranslationKey } from "@/src/shared/i18n/types";
export { LocaleService } from "@/src/shared/i18n/LocaleService";
export { AsyncStorageLocaleStorage } from "@/src/shared/i18n/LocaleStorage";
export type { LocaleStorage } from "@/src/shared/i18n/LocaleStorage";
export { ExpoLocaleDetector } from "@/src/shared/i18n/LocaleDetector";
export type { LocaleDetector } from "@/src/shared/i18n/LocaleDetector";
export { initI18next, i18next } from "@/src/shared/i18n/i18nInstance";
export { useT } from "@/src/shared/i18n/hooks/useT";
export { useFormat } from "@/src/shared/i18n/hooks/useFormat";
