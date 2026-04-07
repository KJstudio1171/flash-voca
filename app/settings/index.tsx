import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme, PaletteId, paletteList, palettes } from "@/src/shared/theme/palettes";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

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

export default function SettingsScreen() {
  const { colors, paletteId, setPalette, colorMode, setColorMode } = useTheme();
  const isDark = colorMode === "dark";

  return (
    <Screen title="Settings" subtitle="앱 설정을 관리합니다">
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>APPEARANCE</Text>
      <View
        style={[
          styles.darkModeRow,
          { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.darkModeLabel, { color: colors.ink }]}>다크 모드</Text>
        <Switch
          value={isDark}
          onValueChange={(v) => setColorMode(v ? "dark" : "light")}
          trackColor={{ false: colors.line, true: colors.primary }}
          thumbColor={colors.onPrimary}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.muted }]}>COLOR PALETTE</Text>
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
  check: {
    ...tokens.typography.subheading,
  },
});
