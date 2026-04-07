import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { tokens } from "@/src/shared/theme/tokens";

type BadgeProps = {
  children: ReactNode;
  tone?: "primary" | "accent" | "info";
};

export function Badge({ children, tone = "primary" }: BadgeProps) {
  const { colors } = useTheme();
  const toneStyle = createToneStyles(colors)[tone];
  const labelStyle = createLabelStyles(colors)[tone];

  return (
    <View style={[styles.base, toneStyle]}>
      <Text style={[styles.label, labelStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
  },
  label: {
    ...tokens.typography.label,
  },
});

const createToneStyles = (colors: ColorScheme) => ({
  primary: { backgroundColor: colors.primarySoft },
  accent: { backgroundColor: colors.accentSoft },
  info: { backgroundColor: colors.infoSoft },
});

const createLabelStyles = (colors: ColorScheme) => ({
  primary: { color: colors.primary },
  accent: { color: colors.accent },
  info: { color: colors.info },
});
