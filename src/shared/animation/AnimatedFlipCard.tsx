import { memo, PropsWithChildren, ReactNode, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

type AnimatedFlipCardProps = PropsWithChildren<{
  back: ReactNode;
  flipped: boolean;
  onPress?: () => void;
}>;

function AnimatedFlipCardComponent({
  children,
  back,
  flipped,
  onPress,
}: AnimatedFlipCardProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(flipped ? 1 : 0, {
      duration: motion.duration.cardFlip,
      easing: motion.easing.standard,
    });
  }, [flipped, rotation]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` },
      { scale: interpolate(rotation.value, [0, 0.3, 0.7, 1], [1, 0.96, 0.96, 1]) },
    ],
    opacity: interpolate(rotation.value, [0, 0.5, 0.5, 1], [1, 1, 0, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(rotation.value, [0, 1], [180, 360])}deg` },
      { scale: interpolate(rotation.value, [0, 0.3, 0.7, 1], [1, 0.96, 0.96, 1]) },
    ],
    opacity: interpolate(rotation.value, [0, 0.5, 0.5, 1], [0, 0, 1, 1]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.root}>
      <View style={styles.stack}>
        <Animated.View style={[styles.face, frontStyle]}>{children}</Animated.View>
        <Animated.View style={[styles.face, styles.backFace, backStyle]}>
          {back}
        </Animated.View>
      </View>
    </Pressable>
  );
}

export const AnimatedFlipCard = memo(AnimatedFlipCardComponent);

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  stack: {
    width: "100%",
  },
  face: {
    width: "100%",
    backfaceVisibility: "hidden",
  },
  backFace: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
});
