// src/shared/theme/ThemeProvider.tsx
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";

import { getDatabaseAsync } from "@/src/core/database/client";
import {
  DEFAULT_FLASHCARD_FONT_ID,
  FlashcardFontId,
  flashcardFontById,
  isFlashcardFontId,
} from "@/src/shared/theme/flashcardFonts";
import {
  ColorMode,
  ColorScheme,
  DEFAULT_COLOR_MODE,
  DEFAULT_PALETTE_ID,
  PaletteId,
  palettes,
} from "@/src/shared/theme/palettes";

type ThemeContextValue = {
  colors: ColorScheme;
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  flashcardFontId: FlashcardFontId;
  flashcardTextStyle: (typeof flashcardFontById)[FlashcardFontId]["textStyle"];
  setFlashcardFont: (id: FlashcardFontId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_PALETTE_ID);
  const [colorMode, setColorModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [flashcardFontId, setFlashcardFontId] = useState<FlashcardFontId>(
    DEFAULT_FLASHCARD_FONT_ID,
  );

  useEffect(() => {
    void loadThemePrefsAsync()
      .then(({ paletteId: pid, colorMode: cm, flashcardFontId: fid }) => {
        setPaletteId(pid);
        setColorModeState(cm);
        setFlashcardFontId(fid);
      })
      .catch(() => {
        setPaletteId(DEFAULT_PALETTE_ID);
        setColorModeState(DEFAULT_COLOR_MODE);
        setFlashcardFontId(DEFAULT_FLASHCARD_FONT_ID);
      });
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteId(id);
    void saveThemePref("palette_id", id).catch(() => {});
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    void saveThemePref("color_mode", mode).catch(() => {});
  }, []);

  const setFlashcardFont = useCallback((id: FlashcardFontId) => {
    setFlashcardFontId(id);
    void saveThemePref("flashcard_font_id", id).catch(() => {});
  }, []);

  const value: ThemeContextValue = {
    colors: palettes[paletteId][colorMode],
    paletteId,
    setPalette,
    colorMode,
    setColorMode,
    flashcardFontId,
    flashcardTextStyle: flashcardFontById[flashcardFontId].textStyle,
    setFlashcardFont,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

async function saveThemePref(key: string, value: string) {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
    key,
    value,
  );
}

const COLOR_MODES: Set<string> = new Set(["light", "dark"]);

async function loadThemePrefsAsync(): Promise<{
  paletteId: PaletteId;
  colorMode: ColorMode;
  flashcardFontId: FlashcardFontId;
}> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_meta WHERE key IN ('palette_id', 'color_mode', 'flashcard_font_id')`,
  );

  let paletteId: PaletteId = DEFAULT_PALETTE_ID;
  let colorMode: ColorMode = DEFAULT_COLOR_MODE;
  let flashcardFontId: FlashcardFontId = DEFAULT_FLASHCARD_FONT_ID;

  for (const row of rows) {
    if (row.key === "palette_id" && row.value in palettes) {
      paletteId = row.value as PaletteId;
    } else if (row.key === "color_mode" && COLOR_MODES.has(row.value)) {
      colorMode = row.value as ColorMode;
    } else if (row.key === "flashcard_font_id" && isFlashcardFontId(row.value)) {
      flashcardFontId = row.value;
    }
  }

  return { paletteId, colorMode, flashcardFontId };
}
