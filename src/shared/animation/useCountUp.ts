import { useEffect } from "react";
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

export function useCountUp(target: number): SharedValue<number> {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(target, {
      duration: motion.duration.normal,
      easing: motion.easing.decelerate,
    });
  }, [target, value]);

  return value;
}
