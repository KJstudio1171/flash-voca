import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { tokens } from "@/src/shared/theme/tokens";

type AppButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
  disabled?: boolean;
}>;

export function AppButton({
  children,
  onPress,
  variant = "primary",
  style,
  disabled = false,
}: AppButtonProps) {
  const { colors } = useTheme();
  const variantStyles = createVariantStyles(colors);
  const labelStyles = createLabelStyles(colors);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: tokens.spacing.l,
    borderRadius: tokens.radius.m,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});

const createVariantStyles = (colors: ColorScheme) => ({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
});

const createLabelStyles = (colors: ColorScheme) => ({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.ink },
  ghost: { color: colors.primary },
});
