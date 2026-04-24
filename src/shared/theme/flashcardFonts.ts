import { TextStyle } from "react-native";

import type { TranslationKey } from "@/src/shared/i18n/types";

export type FlashcardFontId =
  | "system-balanced"
  | "system-rounded"
  | "system-serif"
  | "system-compact"
  | "system-spacious";

export type FlashcardFontPreset = {
  id: FlashcardFontId;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  textStyle: Pick<TextStyle, "fontFamily" | "fontWeight" | "letterSpacing">;
};

export const DEFAULT_FLASHCARD_FONT_ID: FlashcardFontId = "system-balanced";

export const flashcardFontPresets: readonly FlashcardFontPreset[] = [
  {
    id: "system-balanced",
    nameKey: "settings.flashcardFonts.balanced.name",
    descriptionKey: "settings.flashcardFonts.balanced.description",
    textStyle: {
      fontWeight: "800",
      letterSpacing: 0,
    },
  },
  {
    id: "system-rounded",
    nameKey: "settings.flashcardFonts.rounded.name",
    descriptionKey: "settings.flashcardFonts.rounded.description",
    textStyle: {
      fontFamily: "System",
      fontWeight: "700",
      letterSpacing: 0.2,
    },
  },
  {
    id: "system-serif",
    nameKey: "settings.flashcardFonts.serif.name",
    descriptionKey: "settings.flashcardFonts.serif.description",
    textStyle: {
      fontFamily: "serif",
      fontWeight: "700",
      letterSpacing: 0,
    },
  },
  {
    id: "system-compact",
    nameKey: "settings.flashcardFonts.compact.name",
    descriptionKey: "settings.flashcardFonts.compact.description",
    textStyle: {
      fontWeight: "700",
      letterSpacing: -0.2,
    },
  },
  {
    id: "system-spacious",
    nameKey: "settings.flashcardFonts.spacious.name",
    descriptionKey: "settings.flashcardFonts.spacious.description",
    textStyle: {
      fontWeight: "800",
      letterSpacing: 0.7,
    },
  },
];

export const flashcardFontById: Record<FlashcardFontId, FlashcardFontPreset> =
  flashcardFontPresets.reduce(
    (acc, preset) => ({ ...acc, [preset.id]: preset }),
    {} as Record<FlashcardFontId, FlashcardFontPreset>,
  );

export function isFlashcardFontId(value: string): value is FlashcardFontId {
  return value in flashcardFontById;
}
