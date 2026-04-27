import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { useScalePress } from "@/src/shared/animation/useScalePress";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AppButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  style?: StyleProp<ViewStyle>;
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
  const { animatedStyle, pressHandlers } = useScalePress();

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={disabled ? undefined : pressHandlers.onPressIn}
      onPressOut={disabled ? undefined : pressHandlers.onPressOut}
      style={[
        styles.base,
        variantStyles[variant],
        disabled ? styles.disabled : null,
        style,
        disabled ? null : animatedStyle,
      ]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{children}</Text>
    </AnimatedPressable>
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
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...tokens.typography.bodyBold,
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
