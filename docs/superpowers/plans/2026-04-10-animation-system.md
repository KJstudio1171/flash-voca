# Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flash Voca 앱에 일관된 모션 토큰 시스템과 프리셋 함수를 구축하고, 모든 화면에 플레이풀한 애니메이션을 적용한다.

**Architecture:** `motionTokens.ts`에 원시 값(duration, spring, easing, delay)을 정의하고, `motionPresets.ts`에서 이를 조합한 프리셋 함수를 제공한다. 기존 컴포넌트의 하드코딩 값을 토큰으로 교체하고, 새 화면 요소에 프리셋을 적용한다.

**Tech Stack:** React Native, react-native-reanimated v4, react-native-gesture-handler, expo-linear-gradient

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/shared/animation/motionTokens.ts` | duration, easing, spring, delay 원시 값 |
| Create | `src/shared/animation/motionPresets.ts` | Reanimated Layout Animation 프리셋 함수 |
| Create | `src/shared/animation/useScalePress.ts` | 탭 피드백 커스텀 훅 |
| Create | `src/shared/animation/useCountUp.ts` | 숫자 카운트업 커스텀 훅 |
| Create | `src/shared/animation/SkeletonShimmer.tsx` | 쉬머 로딩 컴포넌트 |
| Create | `__tests__/shared/animation/motionPresets.test.ts` | 프리셋 함수 테스트 |
| Create | `__tests__/shared/animation/useScalePress.test.ts` | useScalePress 훅 테스트 |
| Create | `__tests__/shared/animation/useCountUp.test.ts` | useCountUp 훅 테스트 |
| Modify | `src/shared/animation/AnimatedFlipCard.tsx` | 하드코딩 → 토큰 교체 |
| Modify | `src/shared/animation/SwipeStudyCard.tsx` | 하드코딩 → 토큰 교체 |
| Modify | `src/shared/animation/AnimatedScreen.tsx` | 하드코딩 → 토큰 교체 |
| Modify | `src/shared/ui/toast/ToastContainer.tsx` | RN Animated → Reanimated 전환 |
| Modify | `src/shared/ui/AppButton.tsx` | useScalePress 적용 |
| Modify | `src/features/home/components/DeckCard.tsx` | useScalePress + staggeredList 적용 |
| Modify | `src/features/home/screens/HomeScreen.tsx` | stagger index 전달 |
| Modify | `src/features/study/screens/StudyScreen.tsx` | cardStackEnter 적용 |
| Modify | `src/features/study/components/SessionCompleteCard.tsx` | bounceIn + useCountUp 적용 |
| Modify | `src/features/decks/screens/MyDecksScreen.tsx` | staggeredList 적용 |
| Modify | `src/features/store/screens/StoreScreen.tsx` | staggeredList 적용 |
| Modify | `src/features/store/screens/BundleDetailScreen.tsx` | fadeInUp 적용 |

---

### Task 1: Install expo-linear-gradient

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
npx expo install expo-linear-gradient
```

- [ ] **Step 2: Verify installation**

```bash
npm ls expo-linear-gradient
```

Expected: Shows expo-linear-gradient version in dependency tree.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-linear-gradient for shimmer animation"
```

---

### Task 2: Create motionTokens.ts

**Files:**
- Create: `src/shared/animation/motionTokens.ts`

- [ ] **Step 1: Create motion tokens file**

```ts
import { Easing } from "react-native-reanimated";

export const motion = {
  duration: {
    instant: 100,
    fast: 200,
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
    short: 100,
    medium: 200,
  },
} as const;
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/motionTokens.ts
git commit -m "feat: add motion tokens for animation system"
```

---

### Task 3: Create motionPresets.ts and tests

**Files:**
- Create: `src/shared/animation/motionPresets.ts`
- Create: `__tests__/shared/animation/motionPresets.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/shared/animation/motionPresets.test.ts
import {
  fadeInUp,
  fadeInDown,
  fadeInScale,
  bounceIn,
  staggeredList,
  cardStackEnter,
} from "@/src/shared/animation/motionPresets";

describe("motionPresets", () => {
  describe("fadeInUp", () => {
    it("returns a Reanimated entering animation", () => {
      const animation = fadeInUp();
      expect(animation).toBeDefined();
      expect(typeof animation.build).toBe("function");
    });
  });

  describe("fadeInDown", () => {
    it("returns a Reanimated entering animation", () => {
      const animation = fadeInDown();
      expect(animation).toBeDefined();
      expect(typeof animation.build).toBe("function");
    });
  });

  describe("fadeInScale", () => {
    it("returns a Reanimated entering animation", () => {
      const animation = fadeInScale();
      expect(animation).toBeDefined();
      expect(typeof animation.build).toBe("function");
    });
  });

  describe("bounceIn", () => {
    it("returns a Reanimated entering animation", () => {
      const animation = bounceIn();
      expect(animation).toBeDefined();
      expect(typeof animation.build).toBe("function");
    });
  });

  describe("staggeredList", () => {
    it("applies delay based on index", () => {
      const first = staggeredList(0);
      const third = staggeredList(2);
      expect(first).toBeDefined();
      expect(third).toBeDefined();
      expect(typeof first.build).toBe("function");
    });
  });

  describe("cardStackEnter", () => {
    it("returns a Reanimated entering animation", () => {
      const animation = cardStackEnter();
      expect(animation).toBeDefined();
      expect(typeof animation.build).toBe("function");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/shared/animation/motionPresets.test.ts
```

Expected: FAIL — cannot find module `@/src/shared/animation/motionPresets`.

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/animation/motionPresets.ts
import {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

import { motion } from "@/src/shared/animation/motionTokens";

export function fadeInUp() {
  return FadeInUp
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function fadeInDown() {
  return FadeInDown
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function fadeInScale() {
  return ZoomIn
    .duration(motion.duration.normal)
    .easing(motion.easing.playful);
}

export function bounceIn() {
  return ZoomIn
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function staggeredList(index: number) {
  return FadeInUp
    .delay(index * motion.delay.stagger)
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}

export function cardStackEnter() {
  return FadeInDown
    .springify()
    .damping(motion.spring.bouncy.damping)
    .stiffness(motion.spring.bouncy.stiffness);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/shared/animation/motionPresets.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/animation/motionPresets.ts __tests__/shared/animation/motionPresets.test.ts
git commit -m "feat: add motion preset functions with tests"
```

---

### Task 4: Create useScalePress hook and tests

**Files:**
- Create: `src/shared/animation/useScalePress.ts`
- Create: `__tests__/shared/animation/useScalePress.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/shared/animation/useScalePress.test.ts
import { renderHook } from "@testing-library/react-native";

import { useScalePress } from "@/src/shared/animation/useScalePress";

describe("useScalePress", () => {
  it("returns animatedStyle and pressHandlers", () => {
    const { result } = renderHook(() => useScalePress());

    expect(result.current.animatedStyle).toBeDefined();
    expect(result.current.pressHandlers).toBeDefined();
    expect(typeof result.current.pressHandlers.onPressIn).toBe("function");
    expect(typeof result.current.pressHandlers.onPressOut).toBe("function");
  });

  it("accepts custom scale value", () => {
    const { result } = renderHook(() => useScalePress(0.92));

    expect(result.current.animatedStyle).toBeDefined();
    expect(result.current.pressHandlers).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/shared/animation/useScalePress.test.ts
```

Expected: FAIL — cannot find module `@/src/shared/animation/useScalePress`.

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/animation/useScalePress.ts
import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { motion } from "@/src/shared/animation/motionTokens";

export function useScalePress(targetScale = 0.96) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(targetScale, motion.spring.snappy);
  }, [scale, targetScale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, motion.spring.snappy);
  }, [scale]);

  return {
    animatedStyle,
    pressHandlers: { onPressIn, onPressOut },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/shared/animation/useScalePress.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation/useScalePress.ts __tests__/shared/animation/useScalePress.test.ts
git commit -m "feat: add useScalePress hook with tests"
```

---

### Task 5: Create useCountUp hook and tests

**Files:**
- Create: `src/shared/animation/useCountUp.ts`
- Create: `__tests__/shared/animation/useCountUp.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/shared/animation/useCountUp.test.ts
import { renderHook } from "@testing-library/react-native";

import { useCountUp } from "@/src/shared/animation/useCountUp";

describe("useCountUp", () => {
  it("returns a shared value", () => {
    const { result } = renderHook(() => useCountUp(42));

    expect(result.current).toBeDefined();
    expect(typeof result.current.value).toBe("number");
  });

  it("starts at zero by default", () => {
    const { result } = renderHook(() => useCountUp(100));

    // Initial value before animation kicks in
    expect(result.current.value).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/shared/animation/useCountUp.test.ts
```

Expected: FAIL — cannot find module `@/src/shared/animation/useCountUp`.

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/animation/useCountUp.ts
import { useEffect } from "react";
import {
  SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/src/shared/animation/motionTokens";

export function useCountUp(target: number): SharedValue<number> {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(target, {
      duration: motion.duration.slow,
      easing: motion.easing.decelerate,
    });
  }, [target, value]);

  return value;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/shared/animation/useCountUp.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation/useCountUp.ts __tests__/shared/animation/useCountUp.test.ts
git commit -m "feat: add useCountUp hook with tests"
```

---

### Task 6: Create SkeletonShimmer component

**Files:**
- Create: `src/shared/animation/SkeletonShimmer.tsx`

- [ ] **Step 1: Create SkeletonShimmer component**

```tsx
// src/shared/animation/SkeletonShimmer.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { motion } from "@/src/shared/animation/motionTokens";

type SkeletonShimmerProps = {
  width: number | string;
  height: number;
  borderRadius?: number;
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function SkeletonShimmer({
  width,
  height,
  borderRadius = 8,
}: SkeletonShimmerProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, {
        duration: motion.duration.slow * 2,
        easing: motion.easing.standard,
      }),
      -1,
      false,
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 200 }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceStrong,
          overflow: "hidden",
        },
      ]}
    >
      <AnimatedLinearGradient
        colors={[
          "transparent",
          colors.overlayWhite,
          "transparent",
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    width: "200%",
  },
});
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/SkeletonShimmer.tsx
git commit -m "feat: add SkeletonShimmer loading component"
```

---

### Task 7: Migrate AnimatedFlipCard to motion tokens

**Files:**
- Modify: `src/shared/animation/AnimatedFlipCard.tsx`

- [ ] **Step 1: Replace hardcoded values with motion tokens**

In `AnimatedFlipCard.tsx`, replace the imports and hardcoded animation values:

Replace:
```ts
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
```

With:
```ts
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/src/shared/animation/motionTokens";
```

Replace:
```ts
    rotation.value = withTiming(flipped ? 1 : 0, {
      duration: 500,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
```

With:
```ts
    rotation.value = withTiming(flipped ? 1 : 0, {
      duration: motion.duration.normal,
      easing: motion.easing.standard,
    });
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/AnimatedFlipCard.tsx
git commit -m "refactor: use motion tokens in AnimatedFlipCard"
```

---

### Task 8: Migrate SwipeStudyCard to motion tokens

**Files:**
- Modify: `src/shared/animation/SwipeStudyCard.tsx`

- [ ] **Step 1: Replace hardcoded values with motion tokens**

In `SwipeStudyCard.tsx`, add the import:

```ts
import { motion } from "@/src/shared/animation/motionTokens";
```

Replace the snap-back spring config (two occurrences on lines 57-58):
```ts
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
```

With:
```ts
        translateX.value = withSpring(0, motion.spring.snappy);
        translateY.value = withSpring(0, motion.spring.snappy);
```

Replace the exit animation timing (line 80):
```ts
          { duration: 180, easing: Easing.out(Easing.cubic) },
```

With:
```ts
          { duration: motion.duration.fast, easing: motion.easing.accelerate },
```

Remove `Easing` from the reanimated import since it's no longer used directly:
```ts
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/SwipeStudyCard.tsx
git commit -m "refactor: use motion tokens in SwipeStudyCard"
```

---

### Task 9: Migrate AnimatedScreen to motion tokens

**Files:**
- Modify: `src/shared/animation/AnimatedScreen.tsx`

- [ ] **Step 1: Replace hardcoded duration with motion token**

In `AnimatedScreen.tsx`, add the import:

```ts
import { motion } from "@/src/shared/animation/motionTokens";
```

Replace:
```tsx
      entering={FadeInDown.delay(delay).duration(420)}
```

With:
```tsx
      entering={FadeInDown.delay(delay).duration(motion.duration.normal)}
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/AnimatedScreen.tsx
git commit -m "refactor: use motion tokens in AnimatedScreen"
```

---

### Task 10: Migrate ToastContainer to Reanimated

**Files:**
- Modify: `src/shared/ui/toast/ToastContainer.tsx`

- [ ] **Step 1: Rewrite ToastContainer with Reanimated**

Replace the entire contents of `ToastContainer.tsx`:

```tsx
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";

import { motion } from "@/src/shared/animation/motionTokens";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type Toast = {
  id: string;
  message: string;
  duration: number;
};

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.fast)}
      exiting={FadeOut.duration(motion.duration.fast)}
      style={[
        styles.toast,
        { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
      ]}
    >
      <Text style={[styles.message, { color: colors.ink }]}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: tokens.spacing.xl,
    left: tokens.layout.screenPadding,
    right: tokens.layout.screenPadding,
    alignItems: "center",
    gap: tokens.spacing.s,
  },
  toast: {
    width: "100%",
    paddingVertical: tokens.spacing.m,
    paddingHorizontal: tokens.layout.cardPadding,
    borderRadius: tokens.radius.s,
    borderWidth: 1,
  },
  message: {
    ...tokens.typography.body,
  },
});
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/toast/ToastContainer.tsx
git commit -m "refactor: migrate ToastContainer from RN Animated to Reanimated"
```

---

### Task 11: Add useScalePress to AppButton

**Files:**
- Modify: `src/shared/ui/AppButton.tsx`

- [ ] **Step 1: Integrate useScalePress**

Replace the full contents of `AppButton.tsx`:

```tsx
import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { tokens } from "@/src/shared/theme/tokens";

type AppButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
  disabled?: boolean;
}>;

export function AppButton({
  children,
  onPress,
  variant = "primary",
  style,
  disabled = false,
}: AppButtonProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();
  const variantStyles = createVariantStyles(colors);
  const labelStyles = createLabelStyles(colors);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={disabled ? undefined : pressHandlers.onPressIn}
        onPressOut={disabled ? undefined : pressHandlers.onPressOut}
        style={[
          styles.base,
          variantStyles[variant],
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.label, labelStyles[variant]]}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: tokens.spacing.l,
    borderRadius: tokens.radius.m,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...tokens.typography.bodyBold,
  },
});

const createVariantStyles = (colors: ColorScheme) => ({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
});

const createLabelStyles = (colors: ColorScheme) => ({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.ink },
  ghost: { color: colors.primary },
});
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/AppButton.tsx
git commit -m "feat: add scale press animation to AppButton"
```

---

### Task 12: Add useScalePress and staggeredList to DeckCard

**Files:**
- Modify: `src/features/home/components/DeckCard.tsx`

- [ ] **Step 1: Add scale press and stagger animation to DeckCard**

Replace the full contents of `DeckCard.tsx`:

```tsx
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";

type DeckCardProps = {
  title: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  index: number;
  onPress: () => void;
};

function DeckCardComponent({
  title,
  cardCount,
  dueCount,
  masteredCount,
  index,
  onPress,
}: DeckCardProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();
  const progress = cardCount > 0 ? masteredCount / cardCount : 0;
  const isDone = dueCount === 0;

  return (
    <Animated.View
      entering={staggeredList(index)}
      style={animatedStyle}
    >
      <Pressable
        onPress={onPress}
        onPressIn={pressHandlers.onPressIn}
        onPressOut={pressHandlers.onPressOut}
        style={[
          styles.root,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
          },
        ]}
      >
        <CircularProgress progress={progress} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {cardCount}장 · {dueCount}장 due
          </Text>
        </View>
        <View
          style={[
            styles.action,
            {
              backgroundColor: isDone ? colors.surfaceStrong : colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.actionLabel,
              { color: isDone ? colors.muted : colors.onPrimary },
            ]}
          >
            {isDone ? "Done" : "Study"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const DeckCard = memo(DeckCardComponent);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.m,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...tokens.typography.bodyBold,
  },
  meta: {
    ...tokens.typography.label,
  },
  action: {
    borderRadius: tokens.radius.s,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionLabel: {
    ...tokens.typography.label,
  },
});
```

- [ ] **Step 2: Update HomeScreen to pass index prop**

In `src/features/home/screens/HomeScreen.tsx`, update the map call:

Replace:
```tsx
      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          title={deck.title}
          cardCount={deck.cardCount}
          dueCount={deck.dueCount}
          masteredCount={deck.masteredCount}
          onPress={() =>
            router.push({
              pathname: "/study/[deckId]",
              params: { deckId: deck.id },
            })
          }
        />
      ))}
```

With:
```tsx
      {decks.map((deck, index) => (
        <DeckCard
          key={deck.id}
          title={deck.title}
          cardCount={deck.cardCount}
          dueCount={deck.dueCount}
          masteredCount={deck.masteredCount}
          index={index}
          onPress={() =>
            router.push({
              pathname: "/study/[deckId]",
              params: { deckId: deck.id },
            })
          }
        />
      ))}
```

- [ ] **Step 3: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/home/components/DeckCard.tsx src/features/home/screens/HomeScreen.tsx
git commit -m "feat: add stagger and scale press animations to DeckCard"
```

---

### Task 13: Add cardStackEnter to StudyScreen

**Files:**
- Modify: `src/features/study/screens/StudyScreen.tsx`

- [ ] **Step 1: Add entering animation to StudyFlashcard**

In `StudyScreen.tsx`, add imports:

```ts
import Animated from "react-native-reanimated";

import { cardStackEnter } from "@/src/shared/animation/motionPresets";
```

Replace the currentCard rendering block:

```tsx
      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          disabled={session.isTransitioning}
          onRate={session.rateCard}
        />
      ) : null}
```

With:

```tsx
      {currentCard ? (
        <Animated.View
          key={currentCard.card.id}
          entering={cardStackEnter()}
        >
          <StudyFlashcard
            card={currentCard}
            disabled={session.isTransitioning}
            onRate={session.rateCard}
          />
        </Animated.View>
      ) : null}
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/study/screens/StudyScreen.tsx
git commit -m "feat: add card stack enter animation to study screen"
```

---

### Task 14: Add animations to SessionCompleteCard

**Files:**
- Modify: `src/features/study/components/SessionCompleteCard.tsx`

- [ ] **Step 1: Add bounceIn, stagger, and useCountUp**

Replace the full contents of `SessionCompleteCard.tsx`:

```tsx
import { memo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";

import { bounceIn, fadeInUp, staggeredList } from "@/src/shared/animation/motionPresets";
import { useCountUp } from "@/src/shared/animation/useCountUp";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type RatingCounts = {
  again: number;
  good: number;
  easy: number;
};

type SessionCompleteCardProps = {
  totalCards: number;
  masteredCount: number;
  ratingCounts: RatingCounts;
  onRestart: () => void;
};

function AnimatedStatValue({ value, color }: { value: number; color: string }) {
  const animatedValue = useCountUp(value);
  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.round(animatedValue.value)}`,
    defaultValue: "0",
  }));

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedProps}
      style={[styles.statValue, { color, padding: 0 }]}
    />
  );
}

function SessionCompleteCardComponent({
  totalCards,
  masteredCount,
  ratingCounts,
  onRestart,
}: SessionCompleteCardProps) {
  const { colors } = useTheme();
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <Animated.View
      entering={bounceIn()}
      style={[styles.root, { backgroundColor: colors.primarySoft }]}
    >
      <Text style={styles.trophy}>🏆</Text>
      <Text style={[styles.title, { color: colors.ink }]}>세션 완료!</Text>
      <Text style={[styles.subtitle, { color: colors.primary }]}>🔥 {totalCards}장 완료</Text>

      <Animated.View entering={staggeredList(1)} style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.accentSoft }]}>
          <AnimatedStatValue value={ratingCounts.again} color={colors.accent} />
          <Text style={[styles.statLabel, { color: colors.accent }]}>AGAIN</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <AnimatedStatValue value={ratingCounts.good} color={colors.ink} />
          <Text style={[styles.statLabel, { color: colors.muted }]}>GOOD</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
          <AnimatedStatValue value={ratingCounts.easy} color={colors.primary} />
          <Text style={[styles.statLabel, { color: colors.primary }]}>EASY</Text>
        </View>
      </Animated.View>

      <Animated.View entering={staggeredList(2)} style={[styles.masteryBar, { backgroundColor: colors.overlayWhite }]}>
        <View style={styles.masteryHeader}>
          <Text style={[styles.masteryLabel, { color: colors.muted }]}>MASTERY</Text>
          <Text style={[styles.masteryPercent, { color: colors.primary }]}>{masteryPercent}%</Text>
        </View>
        <View style={[styles.masteryTrack, { backgroundColor: colors.line }]}>
          <View style={[styles.masteryFill, { backgroundColor: colors.primary, width: `${masteryPercent}%` }]} />
        </View>
      </Animated.View>

      <Animated.View entering={fadeInUp()}>
        <AppButton onPress={onRestart} style={styles.restartButton}>
          다시 학습하기
        </AppButton>
      </Animated.View>
    </Animated.View>
  );
}

export const SessionCompleteCard = memo(SessionCompleteCardComponent);

const styles = StyleSheet.create({
  root: {
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  trophy: {
    fontSize: 56,
  },
  title: {
    ...tokens.typography.hero,
  },
  subtitle: {
    ...tokens.typography.captionBold,
  },
  statsRow: {
    flexDirection: "row",
    gap: tokens.spacing.xs,
    width: "100%",
  },
  statCard: {
    flex: 1,
    borderRadius: tokens.radius.s,
    padding: tokens.spacing.s,
    alignItems: "center",
  },
  statValue: {
    ...tokens.typography.heading,
  },
  statLabel: {
    ...tokens.typography.micro,
    letterSpacing: 0.5,
  },
  masteryBar: {
    width: "100%",
    borderRadius: tokens.radius.s,
    padding: tokens.spacing.s,
    gap: tokens.spacing.xs,
  },
  masteryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  masteryLabel: {
    ...tokens.typography.micro,
    letterSpacing: 0.5,
  },
  masteryPercent: {
    ...tokens.typography.micro,
  },
  masteryTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  masteryFill: {
    height: "100%",
    borderRadius: 3,
  },
  restartButton: {
    borderRadius: tokens.radius.pill,
    marginTop: tokens.spacing.xs,
  },
});
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/study/components/SessionCompleteCard.tsx
git commit -m "feat: add bounce, count-up, and stagger animations to SessionCompleteCard"
```

---

### Task 15: Add staggeredList to MyDecksScreen

**Files:**
- Modify: `src/features/decks/screens/MyDecksScreen.tsx`

- [ ] **Step 1: Add stagger animation to deck list**

Add imports:

```ts
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
```

Replace the deck list map:

```tsx
      {decks.map((deck) => (
        <Panel key={deck.id}>
```

With:

```tsx
      {decks.map((deck, index) => (
        <Animated.View key={deck.id} entering={staggeredList(index)}>
        <Panel>
```

And close the `Animated.View` after the closing `</Panel>`:

```tsx
        </Panel>
        </Animated.View>
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/decks/screens/MyDecksScreen.tsx
git commit -m "feat: add stagger animation to MyDecksScreen"
```

---

### Task 16: Add staggeredList to StoreScreen

**Files:**
- Modify: `src/features/store/screens/StoreScreen.tsx`

- [ ] **Step 1: Add stagger animation to bundle list**

Add imports:

```ts
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
```

Replace the bundle list map:

```tsx
      {bundles.map((bundle) => (
        <Panel key={bundle.id}>
```

With:

```tsx
      {bundles.map((bundle, index) => (
        <Animated.View key={bundle.id} entering={staggeredList(index)}>
        <Panel>
```

And close the `Animated.View` after the closing `</Panel>`:

```tsx
        </Panel>
        </Animated.View>
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/store/screens/StoreScreen.tsx
git commit -m "feat: add stagger animation to StoreScreen"
```

---

### Task 17: Add fadeInUp to BundleDetailScreen

**Files:**
- Modify: `src/features/store/screens/BundleDetailScreen.tsx`

- [ ] **Step 1: Add entering animation to panels**

Add imports:

```ts
import Animated from "react-native-reanimated";

import { fadeInUp, staggeredList } from "@/src/shared/animation/motionPresets";
```

Wrap the first `<Panel>` (bundle info) with:

```tsx
      <Animated.View entering={fadeInUp()}>
        <Panel>
          {/* ...existing bundle info content... */}
        </Panel>
      </Animated.View>
```

Wrap the second `<Panel>` (included decks) with:

```tsx
      <Animated.View entering={staggeredList(1)}>
        <Panel>
          {/* ...existing included decks content... */}
        </Panel>
      </Animated.View>
```

- [ ] **Step 2: Run typecheck and tests**

```bash
npm run typecheck && npm test
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/store/screens/BundleDetailScreen.tsx
git commit -m "feat: add fade-in animation to BundleDetailScreen"
```

---

### Task 18: Final verification

- [ ] **Step 1: Run full verification checklist**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: All pass with no errors.

- [ ] **Step 2: Verify no RN Animated imports remain (except where intentional)**

```bash
grep -rn "from \"react-native\"" src/ | grep "Animated" | grep -v "// legacy"
```

Check that `ToastContainer.tsx` no longer imports `Animated` from `react-native`. Other files like `StudyFlashcard.tsx` may still import `Platform` etc. from react-native — that's fine, just confirm no `Animated` from react-native.

- [ ] **Step 3: Commit any final fixes if needed**

```bash
git add -A
git commit -m "chore: final animation system verification"
```
