import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type FloatingActionButtonProps = {
  iconName?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
};

export function FloatingActionButton({
  iconName = "plus",
  onPress,
  accessibilityLabel,
}: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={pressHandlers.onPressIn}
      onPressOut={pressHandlers.onPressOut}
      style={[
        styles.root,
        tokens.elevation.card,
        { backgroundColor: colors.primary },
        animatedStyle,
      ]}
    >
      <MaterialCommunityIcons color={colors.onPrimary} name={iconName} size={38} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
});
