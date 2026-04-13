import ko from "@/src/shared/i18n/locales/ko.json";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? Leaves<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

export type TranslationKey = Leaves<typeof ko>;
