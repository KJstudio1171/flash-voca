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

type SwipeDirection = "left" | "right" | "up";

type SwipeStudyCardProps = PropsWithChildren<{
  disabled?: boolean;
  leftActionLabel?: string;
  rightActionLabel?: string;
  upActionLabel?: string;
  onSwipeComplete?: (direction: SwipeDirection) => void;
}>;

const SWIPE_THRESHOLD = 112;
const EXIT_DISTANCE = Dimensions.get("window").width * 1.1;

export function SwipeStudyCard({
  children,
  disabled = false,
  leftActionLabel,
  rightActionLabel,
  upActionLabel,
  onSwipeComplete,
}: SwipeStudyCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 1000])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = Math.min(0, event.translationY);
    })
    .onEnd(() => {
      const absX = Math.abs(translateX.value);
      const absY = Math.abs(translateY.value);
      const isVertical = absY > absX && translateY.value < -SWIPE_THRESHOLD;
      const isHorizontal = absX > SWIPE_THRESHOLD;

      if (!isVertical && !isHorizontal) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        return;
      }

      let direction: SwipeDirection;
      let targetX = 0;
      let targetY = 0;

      if (isVertical) {
        direction = "up";
        targetY = -EXIT_DISTANCE;
      } else {
        direction = translateX.value > 0 ? "right" : "left";
        targetX = direction === "right" ? EXIT_DISTANCE : -EXIT_DISTANCE;
      }

      const animateAxis = (
        sv: { value: number },
        target: number,
        cb?: (finished?: boolean) => void,
      ) => {
        sv.value = withTiming(
          target,
          { duration: 180, easing: Easing.out(Easing.cubic) },
          cb,
        );
      };

      animateAxis(translateX, targetX);
      animateAxis(translateY, targetY, (finished) => {
        if (!finished) return;
        translateX.value = 0;
        translateY.value = 0;
        if (onSwipeComplete) {
          runOnJS(onSwipeComplete)(direction);
        }
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const absY = Math.abs(translateY.value);
    const maxDisplacement = Math.max(absX, absY);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${translateX.value / 20}deg` },
        { scale: interpolate(maxDisplacement, [0, EXIT_DISTANCE], [1, 0.92]) },
      ],
      opacity: interpolate(maxDisplacement, [0, EXIT_DISTANCE], [1, 0.68]),
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const absY = Math.abs(translateY.value);
    const maxDisplacement = Math.max(absX, absY);
    const isUpward = absY > absX;

    let bgColor: string;
    if (isUpward) {
      bgColor = "rgba(20, 51, 45, 0.08)";
    } else if (translateX.value >= 0) {
      bgColor = "rgba(15, 118, 110, 0.1)";
    } else {
      bgColor = "rgba(234, 88, 12, 0.1)";
    }

    return {
      opacity: interpolate(maxDisplacement, [0, SWIPE_THRESHOLD], [0, 1]),
      backgroundColor: bgColor,
    };
  });

  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.value, [24, SWIPE_THRESHOLD], [0, 1]),
    transform: [{ scale: interpolate(-translateX.value, [24, SWIPE_THRESHOLD], [0.96, 1]) }],
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [24, SWIPE_THRESHOLD], [0, 1]),
    transform: [{ scale: interpolate(translateX.value, [24, SWIPE_THRESHOLD], [0.96, 1]) }],
  }));

  const upLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translateY.value, [24, SWIPE_THRESHOLD], [0, 1]),
    transform: [{ scale: interpolate(-translateY.value, [24, SWIPE_THRESHOLD], [0.96, 1]) }],
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
        {upActionLabel ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.actionChip, styles.upChip, upLabelStyle]}
          >
            <Text style={[styles.actionLabel, styles.upLabel]}>{upActionLabel}</Text>
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
  upChip: {
    top: tokens.spacing.m,
    left: "50%",
    transform: [{ translateX: -24 }],
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.line,
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
  upLabel: {
    color: tokens.colors.ink,
  },
});
