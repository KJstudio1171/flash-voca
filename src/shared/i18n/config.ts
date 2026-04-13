export const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh"] as const;
export const DEFAULT_LOCALE = "en" as const;
export const FALLBACK_CHAIN = ["en", "ko"] as const;

export type LanguageCode = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string | null | undefined): value is LanguageCode {
  return value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
