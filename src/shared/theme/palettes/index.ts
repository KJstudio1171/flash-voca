import { coolModern } from "@/src/shared/theme/palettes/cool-modern";
import { natureFresh } from "@/src/shared/theme/palettes/nature-fresh";
import { neutralClean } from "@/src/shared/theme/palettes/neutral-clean";
import { ColorMode, PaletteId, PaletteSet } from "@/src/shared/theme/palettes/types";
import { warmRefresh } from "@/src/shared/theme/palettes/warm-refresh";

export type { ColorMode, ColorScheme, PaletteId, PaletteSet } from "@/src/shared/theme/palettes/types";
export { coolModern } from "@/src/shared/theme/palettes/cool-modern";
export { warmRefresh } from "@/src/shared/theme/palettes/warm-refresh";
export { natureFresh } from "@/src/shared/theme/palettes/nature-fresh";
export { neutralClean } from "@/src/shared/theme/palettes/neutral-clean";

export const DEFAULT_PALETTE_ID: PaletteId = "cool-modern";
export const DEFAULT_COLOR_MODE: ColorMode = "light";

export const palettes: Record<PaletteId, PaletteSet> = {
  "cool-modern": coolModern,
  "warm-refresh": warmRefresh,
  "nature-fresh": natureFresh,
  "neutral-clean": neutralClean,
};

export const paletteList: { id: PaletteId; name: string }[] = [
  { id: "cool-modern", name: "쿨 모던" },
  { id: "warm-refresh", name: "워밍 리프레시" },
  { id: "nature-fresh", name: "자연 프레시" },
  { id: "neutral-clean", name: "뉴트럴 클린" },
];
