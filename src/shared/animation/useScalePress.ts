import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

const PRESSED_SCALE = 0.96;
const IDLE_SCALE = 1;

export function useScalePress() {
  const scale = useSharedValue(IDLE_SCALE);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(PRESSED_SCALE, motion.spring.snappy);
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(IDLE_SCALE, motion.spring.snappy);
  }, [scale]);

  return {
    animatedStyle,
    pressHandlers: { onPressIn, onPressOut },
  };
}
