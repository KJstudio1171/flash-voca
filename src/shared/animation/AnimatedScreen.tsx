import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type AnimatedScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  delay?: number;
}>;

export function AnimatedScreen({
  children,
  style,
  delay = 0,
}: AnimatedScreenProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
