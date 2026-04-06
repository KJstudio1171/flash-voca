import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { tokens } from "@/src/shared/theme/tokens";

type PanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}>;

export function Panel({ children, style, accentColor }: PanelProps) {
  return (
    <View
      style={[
        styles.base,
        accentColor ? { borderLeftColor: accentColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.l,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderLeftWidth: 5,
    borderLeftColor: "transparent",
    padding: tokens.spacing.l,
    gap: tokens.spacing.s,
  },
});
