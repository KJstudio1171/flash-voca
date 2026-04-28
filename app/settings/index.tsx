import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { SrsAlgorithmPicker } from "@/src/features/settings/components/SrsAlgorithmPicker";
import {
  StudyInteractionMode,
  useStudyPreferences,
} from "@/src/features/study/preferences/StudyPreferencesProvider";
import { useT } from "@/src/shared/i18n";
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

function StudyModeRow({
  description,
  label,
  selected,
  onSelect,
}: {
  description: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.studyModeRow,
        {
          backgroundColor: colors.surfaceStrong,
          borderColor: selected ? colors.primary : colors.line,
        },
      ]}
    >
      <View
        style={[
          styles.radioOuter,
          { borderColor: selected ? colors.primary : colors.line },
        ]}
      >
        {selected ? (
          <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
        ) : null}
      </View>
      <View style={styles.studyModeCopy}>
        <Text style={[styles.studyModeLabel, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.studyModeDescription, { color: colors.muted }]}>
          {description}
        </Text>
      </View>
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
  const {
    allowFrontSwipe,
    interactionMode,
    saveStudyPreferences,
  } = useStudyPreferences();
  const toast = useToast();
  const [draftFlashcardFontId, setDraftFlashcardFontId] =
    useState<FlashcardFontId>(flashcardFontId);
  const [draftInteractionMode, setDraftInteractionMode] =
    useState<StudyInteractionMode>(interactionMode);
  const [draftAllowFrontSwipe, setDraftAllowFrontSwipe] =
    useState(allowFrontSwipe);
  const isDark = colorMode === "dark";
  const hasFontChange = draftFlashcardFontId !== flashcardFontId;
  const hasStudyPreferenceChange =
    draftInteractionMode !== interactionMode ||
    draftAllowFrontSwipe !== allowFrontSwipe;
  const hasPreferenceChange = hasFontChange || hasStudyPreferenceChange;
  const studyModeOptions: {
    id: StudyInteractionMode;
    label: string;
    description: string;
  }[] = [
    {
      id: "button_swipe",
      label: t("settings.studyMode.buttonSwipe.title"),
      description: t("settings.studyMode.buttonSwipe.description"),
    },
    {
      id: "swipe_only",
      label: t("settings.studyMode.swipeOnly.title"),
      description: t("settings.studyMode.swipeOnly.description"),
    },
    {
      id: "button_only",
      label: t("settings.studyMode.buttonOnly.title"),
      description: t("settings.studyMode.buttonOnly.description"),
    },
  ];

  useEffect(() => {
    setDraftFlashcardFontId(flashcardFontId);
  }, [flashcardFontId]);

  useEffect(() => {
    setDraftInteractionMode(interactionMode);
    setDraftAllowFrontSwipe(allowFrontSwipe);
  }, [allowFrontSwipe, interactionMode]);

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

      <Text style={[styles.sectionLabel, { color: colors.muted }]}>
        {t("settings.studySettings")}
      </Text>
      <View
        style={[
          styles.studySettingsPanel,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.studySettingsTitle, { color: colors.ink }]}>
          {t("settings.studyMethod")}
        </Text>
        <View style={styles.studyModeList}>
          {studyModeOptions.map((item) => (
            <StudyModeRow
              description={item.description}
              key={item.id}
              label={item.label}
              onSelect={() => setDraftInteractionMode(item.id)}
              selected={draftInteractionMode === item.id}
            />
          ))}
        </View>

        <View style={[styles.studyDivider, { backgroundColor: colors.line }]} />

        <View style={styles.frontSwipeRow}>
          <View style={styles.frontSwipeCopy}>
            <Text style={[styles.frontSwipeTitle, { color: colors.ink }]}>
              {t("settings.allowFrontSwipe.title")}
            </Text>
            <Text style={[styles.frontSwipeDescription, { color: colors.muted }]}>
              {t("settings.allowFrontSwipe.description")}
            </Text>
          </View>
          <Switch
            value={draftAllowFrontSwipe}
            onValueChange={setDraftAllowFrontSwipe}
            trackColor={{ false: colors.line, true: colors.primary }}
            thumbColor={colors.onPrimary}
          />
        </View>
      </View>

      <SrsAlgorithmPicker />

      <AppButton
        disabled={!hasPreferenceChange}
        onPress={() => {
          if (hasFontChange) {
            setFlashcardFont(draftFlashcardFontId);
          }
          if (hasStudyPreferenceChange) {
            saveStudyPreferences({
              interactionMode: draftInteractionMode,
              allowFrontSwipe: draftAllowFrontSwipe,
            });
          }
          toast.show(t("settings.preferencesSaved"));
        }}
        style={styles.saveButton}
      >
        {t("settings.savePreferences")}
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
  studySettingsPanel: {
    borderRadius: tokens.radius.l,
    borderWidth: 1,
    gap: tokens.spacing.m,
    padding: tokens.spacing.l,
  },
  studySettingsTitle: {
    ...tokens.typography.heading,
  },
  studyModeList: {
    gap: tokens.spacing.s,
  },
  studyModeRow: {
    alignItems: "center",
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    minHeight: 86,
    padding: tokens.spacing.m,
  },
  radioOuter: {
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    borderWidth: 3,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  radioInner: {
    borderRadius: tokens.radius.pill,
    height: 18,
    width: 18,
  },
  studyModeCopy: {
    flex: 1,
    gap: 4,
  },
  studyModeLabel: {
    ...tokens.typography.heading,
  },
  studyModeDescription: {
    ...tokens.typography.body,
  },
  studyDivider: {
    height: 1,
  },
  frontSwipeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.m,
    justifyContent: "space-between",
  },
  frontSwipeCopy: {
    flex: 1,
    gap: 4,
  },
  frontSwipeTitle: {
    ...tokens.typography.subheading,
  },
  frontSwipeDescription: {
    ...tokens.typography.body,
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
