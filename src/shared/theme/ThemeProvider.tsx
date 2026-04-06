// src/shared/theme/ThemeProvider.tsx
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";

import { getDatabaseAsync } from "@/src/core/database/client";
import {
  ColorScheme,
  DEFAULT_PALETTE_ID,
  PaletteId,
  palettes,
} from "@/src/shared/theme/palettes";

type ThemeContextValue = {
  colors: ColorScheme;
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_PALETTE_ID);

  useEffect(() => {
    void loadPaletteIdAsync().then(setPaletteId);
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteId(id);
    void savePaletteId(id);
  }, []);

  const value: ThemeContextValue = {
    colors: palettes[paletteId],
    paletteId,
    setPalette,
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

async function savePaletteId(id: PaletteId) {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('palette_id', ?)`,
    id,
  );
}

async function loadPaletteIdAsync(): Promise<PaletteId> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'palette_id'`,
  );
  if (row && row.value in palettes) {
    return row.value as PaletteId;
  }
  return DEFAULT_PALETTE_ID;
}
