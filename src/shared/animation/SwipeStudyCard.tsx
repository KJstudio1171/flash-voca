import { PropsWithChildren } from "react";
import { Dimensions, StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/src/shared/theme/tokens";

type SwipeDirection = "left" | "right";

type SwipeStudyCardProps = PropsWithChildren<{
  disabled?: boolean;
  leftActionLabel?: string;
  rightActionLabel?: string;
  onSwipeComplete?: (direction: SwipeDirection) => void;
}>;

const SWIPE_THRESHOLD = 112;
const EXIT_DISTANCE = Dimensions.get("window").width * 1.1;

export function SwipeStudyCard({
  children,
  disabled = false,
  leftActionLabel,
  rightActionLabel,
  onSwipeComplete,
}: SwipeStudyCardProps) {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      const shouldDismiss = Math.abs(translateX.value) > SWIPE_THRESHOLD;

      if (!shouldDismiss) {
        translateX.value = withSpring(0, {
          damping: 18,
          stiffness: 220,
        });
        return;
      }

      const direction: SwipeDirection = translateX.value > 0 ? "right" : "left";
      const target = direction === "right" ? EXIT_DISTANCE : -EXIT_DISTANCE;

      translateX.value = withTiming(
        target,
        {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (!finished) {
            return;
          }

          translateX.value = 0;

          if (onSwipeComplete) {
            runOnJS(onSwipeComplete)(direction);
          }
        },
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${translateX.value / 20}deg` },
      { scale: interpolate(Math.abs(translateX.value), [0, EXIT_DISTANCE], [1, 0.92]) },
    ],
    opacity: interpolate(Math.abs(translateX.value), [0, EXIT_DISTANCE], [1, 0.68]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(translateX.value), [0, SWIPE_THRESHOLD], [0, 1]),
    backgroundColor:
      translateX.value >= 0 ? "rgba(15, 118, 110, 0.1)" : "rgba(234, 88, 12, 0.1)",
  }));

  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.value, [24, SWIPE_THRESHOLD], [0, 1]),
    transform: [{ scale: interpolate(-translateX.value, [24, SWIPE_THRESHOLD], [0.96, 1]) }],
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [24, SWIPE_THRESHOLD], [0, 1]),
    transform: [{ scale: interpolate(translateX.value, [24, SWIPE_THRESHOLD], [0.96, 1]) }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrapper, animatedStyle]}>
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
        {leftActionLabel ? (
          <Animated.View pointerEvents="none" style={[styles.actionChip, styles.leftChip, leftLabelStyle]}>
            <Text style={[styles.actionLabel, styles.leftLabel]}>{leftActionLabel}</Text>
          </Animated.View>
        ) : null}
        {rightActionLabel ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.actionChip, styles.rightChip, rightLabelStyle]}
          >
            <Text style={[styles.actionLabel, styles.rightLabel]}>{rightActionLabel}</Text>
          </Animated.View>
        ) : null}
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radius.l,
  },
  actionChip: {
    position: "absolute",
    top: tokens.spacing.m,
    zIndex: 1,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
  },
  leftChip: {
    left: tokens.spacing.m,
    backgroundColor: tokens.colors.accentSoft,
    borderColor: "rgba(234, 88, 12, 0.2)",
  },
  rightChip: {
    right: tokens.spacing.m,
    backgroundColor: tokens.colors.primarySoft,
    borderColor: "rgba(15, 118, 110, 0.2)",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  leftLabel: {
    color: tokens.colors.accent,
  },
  rightLabel: {
    color: tokens.colors.primary,
  },
});
