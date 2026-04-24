import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

const PRESSED_SCALE = 0.98;
const IDLE_SCALE = 1;

export function useScalePress() {
  const scale = useSharedValue(IDLE_SCALE);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withTiming(PRESSED_SCALE, {
      duration: motion.duration.instant,
      easing: motion.easing.decelerate,
    });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(IDLE_SCALE, {
      duration: motion.duration.fast,
      easing: motion.easing.decelerate,
    });
  }, [scale]);

  return {
    animatedStyle,
    pressHandlers: { onPressIn, onPressOut },
  };
}
