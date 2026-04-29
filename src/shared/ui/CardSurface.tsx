import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type CardSurfaceProps = PropsWithChildren<{
  elevation?: "none" | "soft" | "card";
  padding?: "none" | "s" | "m" | "l";
  style?: StyleProp<ViewStyle>;
}>;

export function CardSurface({
  children,
  elevation = "none",
  padding = "l",
  style,
}: CardSurfaceProps) {
  const { colors } = useTheme();
  const elevationStyle = elevation === "none" ? null : tokens.elevation[elevation];
  const paddingStyle = padding === "none" ? null : { padding: paddingBySize[padding] };

  return (
    <View
      style={[
        styles.base,
        elevationStyle,
        paddingStyle,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const paddingBySize = {
  s: tokens.spacing.s,
  m: tokens.spacing.m,
  l: tokens.spacing.l,
};

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.l,
    borderWidth: tokens.borderWidth.hairline,
    gap: tokens.spacing.s,
  },
});
