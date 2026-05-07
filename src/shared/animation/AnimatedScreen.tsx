import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { emphasisFadeUp, screenFade } from "./motionPresets";

type AnimatedScreenVariant = "none" | "fade" | "fadeUp";

type AnimatedScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  delay?: number;
  variant?: AnimatedScreenVariant;
}>;

export function AnimatedScreen({
  children,
  style,
  delay = 0,
  variant = "fade",
}: AnimatedScreenProps) {
  if (variant === "none") {
    return <View style={style}>{children}</View>;
  }

  const entering = variant === "fadeUp" ? emphasisFadeUp(delay) : screenFade(delay);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
