import type { LanguageCode } from "@/src/shared/i18n/config";

type DateStyle = "short" | "medium" | "long";

const cache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: LanguageCode, style: DateStyle): Intl.DateTimeFormat {
  const key = `${locale}:${style}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: style });
    cache.set(key, formatter);
  }
  return formatter;
}

export function clearDateFormatCache(): void {
  cache.clear();
}

export function formatDate(
  value: Date | string,
  locale: LanguageCode,
  style: DateStyle = "medium",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return getFormatter(locale, style).format(date);
}
