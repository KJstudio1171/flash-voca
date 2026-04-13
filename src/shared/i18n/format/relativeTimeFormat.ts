import type { LanguageCode } from "@/src/shared/i18n/config";

const cache = new Map<LanguageCode, Intl.RelativeTimeFormat>();

function getFormatter(locale: LanguageCode): Intl.RelativeTimeFormat {
  let formatter = cache.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    cache.set(locale, formatter);
  }
  return formatter;
}

export function clearRelativeTimeFormatCache(): void {
  cache.clear();
}

type Unit = Intl.RelativeTimeFormatUnit;

const UNIT_BOUNDS: readonly { unit: Unit; seconds: number }[] = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

export function formatRelativeTime(
  fromIso: string,
  locale: LanguageCode,
  now: Date = new Date(),
): string {
  const from = new Date(fromIso);
  const diffSec = Math.round((from.getTime() - now.getTime()) / 1000);
  const absSec = Math.abs(diffSec);

  for (const { unit, seconds } of UNIT_BOUNDS) {
    if (absSec >= seconds || unit === "second") {
      const value = Math.round(diffSec / seconds);
      return getFormatter(locale).format(value, unit);
    }
  }

  return getFormatter(locale).format(0, "second");
}
