import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type PanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}>;

export function Panel({ children, style, accentColor }: PanelProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderLeftColor: accentColor ?? "transparent",
        },
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
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: tokens.spacing.l,
    gap: tokens.spacing.s,
  },
});
