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

  elevation: {
    card: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 22,
      elevation: 4,
    },
    soft: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    },
  },

  typography: {
    screenTitle: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
    pageTitleLarge: { fontSize: 42, fontWeight: "800" as const, lineHeight: 50 },
    pageTitle: { fontSize: 34, fontWeight: "800" as const, lineHeight: 40 },
    hero: { fontSize: 26, fontWeight: "800" as const, lineHeight: 32 },
    heading: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
    subheading: { fontSize: 16, fontWeight: "700" as const, lineHeight: 22 },
    body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    bodyBold: { fontSize: 15, fontWeight: "700" as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
    captionBold: { fontSize: 13, fontWeight: "700" as const, lineHeight: 18 },
    label: { fontSize: 12, fontWeight: "700" as const, lineHeight: 16 },
    micro: { fontSize: 10, fontWeight: "600" as const, lineHeight: 14 },
    flashcardTerm: { fontSize: 46, fontWeight: "800" as const, lineHeight: 54 },
    flashcardMeaning: { fontSize: 36, fontWeight: "800" as const, lineHeight: 44 },
  },
};
