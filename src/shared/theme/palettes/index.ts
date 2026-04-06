export type { ColorScheme, PaletteId } from "@/src/shared/theme/palettes/types";
export { coolModern } from "@/src/shared/theme/palettes/cool-modern";
export { warmRefresh } from "@/src/shared/theme/palettes/warm-refresh";
export { natureFresh } from "@/src/shared/theme/palettes/nature-fresh";
export { neutralClean } from "@/src/shared/theme/palettes/neutral-clean";

import { coolModern } from "@/src/shared/theme/palettes/cool-modern";
import { warmRefresh } from "@/src/shared/theme/palettes/warm-refresh";
import { natureFresh } from "@/src/shared/theme/palettes/nature-fresh";
import { neutralClean } from "@/src/shared/theme/palettes/neutral-clean";
import { ColorScheme, PaletteId } from "@/src/shared/theme/palettes/types";

export const DEFAULT_PALETTE_ID: PaletteId = "cool-modern";

export const palettes: Record<PaletteId, ColorScheme> = {
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
