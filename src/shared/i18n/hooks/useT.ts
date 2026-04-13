import { useTranslation } from "react-i18next";

import type { LanguageCode } from "@/src/shared/i18n/config";
import type { TranslationKey } from "@/src/shared/i18n/types";

type InterpolationValues = Record<string, string | number>;

export function useT() {
  const { t, i18n } = useTranslation();

  return {
    t: (key: TranslationKey, values?: InterpolationValues): string =>
      t(key, values ?? {}) as string,
    locale: i18n.language as LanguageCode,
  };
}
