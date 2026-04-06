import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@/src/shared/theme/tokens";

type BadgeProps = {
  children: ReactNode;
  tone?: "primary" | "accent" | "info";
};

export function Badge({ children, tone = "primary" }: BadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={[styles.label, labelStyles[tone]]}>{children}</Text>
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
    fontSize: 12,
    fontWeight: "700",
  },
});

const toneStyles = StyleSheet.create({
  primary: {
    backgroundColor: tokens.colors.primarySoft,
  },
  accent: {
    backgroundColor: tokens.colors.accentSoft,
  },
  info: {
    backgroundColor: tokens.colors.infoSoft,
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: tokens.colors.primary,
  },
  accent: {
    color: tokens.colors.accent,
  },
  info: {
    color: tokens.colors.info,
  },
});
