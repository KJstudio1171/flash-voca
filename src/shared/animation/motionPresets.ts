import {
  FadeIn,
  FadeInDown as RNFadeInDown,
  FadeInUp as RNFadeInUp,
  FadeOut,
  SlideInDown,
  SlideInUp,
  ZoomIn,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

export function fadeInUp(delay = 0) {
  return RNFadeInUp.delay(delay)
    .duration(motion.duration.normal)
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function fadeInDown(delay = 0) {
  return RNFadeInDown.delay(delay)
    .duration(motion.duration.normal)
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function fadeInScale(delay = 0) {
  return ZoomIn.delay(delay)
    .duration(motion.duration.normal)
    .easing(motion.easing.playful);
}

export function bounceIn(delay = 0) {
  return ZoomIn.delay(delay)
    .duration(motion.duration.normal)
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function staggeredList(index: number) {
  return fadeInUp(index * motion.delay.stagger);
}

export function cardStackEnter() {
  return SlideInUp.duration(motion.duration.normal)
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export { FadeIn, FadeOut, SlideInDown };

export function stackPushOptions() {
  return {
    animation: "slide_from_right" as const,
    animationDuration: motion.duration.normal,
  };
}

export function modalPushOptions() {
  return {
    animation: "slide_from_bottom" as const,
    animationDuration: motion.duration.normal,
  };
}

export function tabShiftOptions() {
  return {
    animation: "shift" as const,
    animationDuration: motion.duration.fast,
  };
}
