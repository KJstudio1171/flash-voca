import { Easing } from "react-native-reanimated";

export const motion = {
  duration: {
    instant: 100,
    tab: 140,
    content: 180,
    fast: 200,
    navigation: 300,
    cardFlip: 320,
    normal: 350,
    slow: 500,
  },
  easing: {
    standard: Easing.bezier(0.4, 0.0, 0.2, 1),
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0.0, 1, 1),
    playful: Easing.bezier(0.34, 1.56, 0.64, 1),
  },
  spring: {
    gentle: { damping: 20, stiffness: 180 },
    bouncy: { damping: 12, stiffness: 260 },
    snappy: { damping: 18, stiffness: 320 },
  },
  delay: {
    stagger: 50,
    maxStagger: 250,
    short: 100,
    medium: 200,
  },
} as const;

export type MotionDurationToken = keyof typeof motion.duration;
export type MotionSpringToken = keyof typeof motion.spring;
