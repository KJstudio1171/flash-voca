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
  primarySoftStrong: string;
  accent: string;
  accentSoft: string;
  info: string;
  infoSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  line: string;
  onPrimary: string;
  overlayWhite: string;
  overlayBlack: string;
  primaryGlow: string;
  accentGlow: string;
  neutralGlow: string;
  cardShadowFront: string;
  cardShadowBack: string;
};

export type PaletteSet = {
  light: ColorScheme;
  dark: ColorScheme;
};
