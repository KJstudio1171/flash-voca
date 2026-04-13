import type { LanguageCode } from "@/src/shared/i18n/config";

const cache = new Map<LanguageCode, Intl.NumberFormat>();

function getFormatter(locale: LanguageCode): Intl.NumberFormat {
  let formatter = cache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    cache.set(locale, formatter);
  }
  return formatter;
}

export function clearNumberFormatCache(): void {
  cache.clear();
}

export function formatNumber(value: number, locale: LanguageCode): string {
  return getFormatter(locale).format(value);
}
