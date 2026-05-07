import {
  FadeIn,
  FadeInDown as RNFadeInDown,
  FadeInUp as RNFadeInUp,
  FadeOut,
  SlideInDown,
  ZoomIn,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

function cappedStaggerDelay(index: number) {
  return Math.min(index * motion.delay.stagger, motion.delay.maxStagger);
}

export function fadeInUp(delay = 0) {
  return RNFadeInUp.delay(delay)
    .duration(motion.duration.fast)
    .easing(motion.easing.decelerate);
}

export function fadeInDown(delay = 0) {
  return RNFadeInDown.delay(delay)
    .duration(motion.duration.fast)
    .easing(motion.easing.decelerate);
}

export function fadeIn(delay = 0) {
  return FadeIn.delay(delay)
    .duration(motion.duration.content)
    .easing(motion.easing.decelerate);
}

export function screenFade(delay = 0) {
  return fadeIn(delay);
}

export function emphasisFadeUp(delay = 0) {
  return fadeInUp(delay);
}

export function fadeInScale(delay = 0) {
  return ZoomIn.delay(delay)
    .duration(motion.duration.fast)
    .easing(motion.easing.decelerate);
}

export function bounceIn(delay = 0) {
  return ZoomIn.delay(delay)
    .duration(motion.duration.normal)
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function staggeredList(index: number) {
  return emphasisFadeUp(cappedStaggerDelay(index));
}

export function cardStackEnter() {
  return studyCardEnter();
}

export function studyCardEnter() {
  return FadeIn.duration(motion.duration.content)
    .easing(motion.easing.decelerate)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.985 }],
    });
}

export { FadeIn, FadeOut, SlideInDown };

export function stackPushOptions() {
  return {
    animation: "slide_from_right" as const,
    animationDuration: motion.duration.navigation,
  };
}

export function modalPushOptions() {
  return {
    animation: "slide_from_bottom" as const,
    animationDuration: motion.duration.navigation,
  };
}

export function tabShiftOptions() {
  return {
    animation: "fade" as const,
    animationDuration: motion.duration.tab,
  };
}
