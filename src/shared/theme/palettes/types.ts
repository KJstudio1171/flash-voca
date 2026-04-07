export type PaletteId = "cool-modern" | "warm-refresh" | "nature-fresh" | "neutral-clean";

export type ColorMode = "light" | "dark";

export type ColorScheme = {
  canvas: string;
  surface: string;
  surfaceStrong: string;
  ink: string;
  muted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  info: string;
  infoSoft: string;
  line: string;
  onPrimary: string;
  overlayWhite: string;
  primaryGlow: string;
  accentGlow: string;
  neutralGlow: string;
  chipAgainBg: string;
  chipAgainBorder: string;
  chipEasyBg: string;
  chipEasyBorder: string;
  primarySoftStrong: string;
  cardShadowFront: string;
  cardShadowBack: string;
};

export type PaletteSet = {
  light: ColorScheme;
  dark: ColorScheme;
};
