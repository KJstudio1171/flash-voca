import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import {
  FlashcardFontId,
  flashcardFontPresets,
} from "@/src/shared/theme/flashcardFonts";
import { ColorScheme, PaletteId, paletteList, palettes } from "@/src/shared/theme/palettes";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";
import { useToast } from "@/src/shared/ui/toast";
import { useT } from "@/src/shared/i18n";

function PaletteRow({
  id,
  name,
  palette,
  selected,
  onSelect,
}: {
  id: PaletteId;
  name: string;
  palette: ColorScheme;  // resolved for current colorMode
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.paletteRow,
        {
          backgroundColor: colors.surfaceStrong,
          borderColor: selected ? colors.primary : colors.line,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.swatches}>
        <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
        <View style={[styles.swatch, { backgroundColor: palette.accent }]} />
        <View style={[styles.swatch, { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.line }]} />
      </View>
      <Text style={[styles.paletteName, { color: colors.ink }]}>{name}</Text>
      {selected ? <Text style={[styles.check, { color: colors.primary }]}>✓</Text> : null}
    </Pressable>
  );
}

function FontRow({
  id,
  name,
  description,
  selected,
  onSelect,
}: {
  id: FlashcardFontId;
  name: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.fontRow,
        {
          backgroundColor: colors.surfaceStrong,
          borderColor: selected ? colors.primary : colors.line,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.fontCopy}>
        <Text style={[styles.fontName, { color: colors.ink }]}>{name}</Text>
        <Text style={[styles.fontDescription, { color: colors.muted }]}>{description}</Text>
      </View>
      {selected ? <Text style={[styles.check, { color: colors.primary }]}>✓</Text> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useT();
  const {
    colors,
    paletteId,
    setPalette,
    colorMode,
    setColorMode,
    flashcardFontId,
    setFlashcardFont,
  } = useTheme();
  const toast = useToast();
  const [draftFlashcardFontId, setDraftFlashcardFontId] =
    useState<FlashcardFontId>(flashcardFontId);
  const isDark = colorMode === "dark";
  const hasFontChange = draftFlashcardFontId !== flashcardFontId;

  useEffect(() => {
    setDraftFlashcardFontId(flashcardFontId);
  }, [flashcardFontId]);

  return (
    <Screen title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>
        {t("settings.appearance")}
      </Text>
      <View
        style={[
          styles.darkModeRow,
          { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.darkModeLabel, { color: colors.ink }]}>
          {t("settings.darkMode")}
        </Text>
        <Switch
          value={isDark}
          onValueChange={(v) => setColorMode(v ? "dark" : "light")}
          trackColor={{ false: colors.line, true: colors.primary }}
          thumbColor={colors.onPrimary}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.muted }]}>
        {t("settings.colorPalette")}
      </Text>
      <View style={styles.paletteList}>
        {paletteList.map((item) => (
          <PaletteRow
            key={item.id}
            id={item.id}
            name={item.name}
            palette={palettes[item.id][colorMode]}
            selected={paletteId === item.id}
            onSelect={() => setPalette(item.id)}
          />
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.muted }]}>
        {t("settings.flashcardFont")}
      </Text>
      <View style={styles.fontList}>
        {flashcardFontPresets.map((item) => (
          <FontRow
            key={item.id}
            id={item.id}
            name={t(item.nameKey)}
            description={t(item.descriptionKey)}
            selected={draftFlashcardFontId === item.id}
            onSelect={() => setDraftFlashcardFontId(item.id)}
          />
        ))}
      </View>
      <AppButton
        disabled={!hasFontChange}
        onPress={() => {
          setFlashcardFont(draftFlashcardFontId);
          toast.show(t("settings.flashcardFontSaved"));
        }}
        style={styles.saveButton}
      >
        {t("settings.saveFlashcardFont")}
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...tokens.typography.micro,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: tokens.spacing.xs,
  },
  darkModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: tokens.spacing.m,
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    marginBottom: tokens.layout.sectionGap,
  },
  darkModeLabel: {
    ...tokens.typography.bodyBold,
  },
  paletteList: {
    gap: tokens.spacing.s,
  },
  fontList: {
    gap: tokens.spacing.s,
  },
  paletteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.s,
    padding: tokens.spacing.m,
    borderRadius: tokens.radius.m,
  },
  swatches: {
    flexDirection: "row",
    gap: 3,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  paletteName: {
    flex: 1,
    ...tokens.typography.captionBold,
  },
  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.s,
    padding: tokens.spacing.m,
    borderRadius: tokens.radius.m,
  },
  fontCopy: {
    flex: 1,
    gap: 2,
  },
  fontName: {
    ...tokens.typography.captionBold,
  },
  fontDescription: {
    ...tokens.typography.caption,
  },
  check: {
    ...tokens.typography.subheading,
  },
  saveButton: {
    marginTop: -tokens.spacing.xs,
  },
});
