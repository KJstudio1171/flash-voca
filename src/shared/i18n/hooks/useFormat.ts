import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { LanguageCode } from "@/src/shared/i18n/config";
import { formatDate } from "@/src/shared/i18n/format/dateFormat";
import { formatNumber } from "@/src/shared/i18n/format/numberFormat";
import { formatRelativeTime } from "@/src/shared/i18n/format/relativeTimeFormat";

type DateStyle = "short" | "medium" | "long";

export function useFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language as LanguageCode;

  return useMemo(
    () => ({
      date: (value: Date | string, style?: DateStyle) => formatDate(value, locale, style),
      number: (value: number) => formatNumber(value, locale),
      relative: (fromIso: string, now?: Date) => formatRelativeTime(fromIso, locale, now),
    }),
    [locale],
  );
}
