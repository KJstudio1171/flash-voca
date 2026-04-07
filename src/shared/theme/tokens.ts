export const tokens = {
  spacing: {
    xs: 6,
    s: 12,
    m: 16,
    l: 20,
    xl: 28,
    xxl: 36,
  },

  layout: {
    screenPadding: 20,
    sectionGap: 20,
    cardPadding: 20,
    cardGap: 12,
    inlineGap: 12,
    stackGap: 6,
  },

  radius: {
    s: 12,
    m: 18,
    l: 24,
    pill: 999,
  },

  typography: {
    screenTitle: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
    hero: { fontSize: 26, fontWeight: "800" as const, lineHeight: 32 },
    heading: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
    subheading: { fontSize: 16, fontWeight: "700" as const, lineHeight: 22 },
    body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    bodyBold: { fontSize: 15, fontWeight: "700" as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
    captionBold: { fontSize: 13, fontWeight: "700" as const, lineHeight: 18 },
    label: { fontSize: 12, fontWeight: "700" as const, lineHeight: 16 },
    micro: { fontSize: 10, fontWeight: "600" as const, lineHeight: 14 },
  },
};
