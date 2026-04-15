import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { fadeInUp } from "./motionPresets";

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
    <Animated.View entering={fadeInUp(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
