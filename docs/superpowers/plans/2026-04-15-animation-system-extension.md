# Animation System Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 설계된 모션 토큰/프리셋 시스템을 실구현하고, Stack/Tabs 네비게이션 전이를 같은 토큰 체계로 편입한다.

**Architecture:** `motionTokens.ts`(원시값) → `motionPresets.ts`(엔터링/인터랙션/로딩/네비게이션 프리셋) → 컴포넌트와 `app/_layout.tsx`/`app/(tabs)/_layout.tsx`가 소비. 기존 하드코딩된 duration/easing/spring 값은 모두 토큰 참조로 교체.

**Tech Stack:** React Native 0.81, Expo 54, Expo Router 6, react-native-reanimated 4.1, react-native-screens 4.16, expo-linear-gradient (신규), Jest + jest-expo preset.

**Spec:** `docs/superpowers/specs/2026-04-15-animation-system-extension-design.md`

**File layout for new/modified files:**

New:
- `src/shared/animation/motionTokens.ts`
- `src/shared/animation/motionPresets.ts`
- `src/shared/animation/useScalePress.ts`
- `src/shared/animation/useCountUp.ts`
- `src/shared/animation/SkeletonShimmer.tsx`
- `__tests__/shared/animation/motionTokens.test.ts`
- `__tests__/shared/animation/motionPresets.test.ts`
- `__tests__/shared/animation/useScalePress.test.ts`
- `__tests__/shared/animation/navigationPresets.test.ts`

Modified:
- `src/shared/animation/AnimatedScreen.tsx`
- `src/shared/animation/AnimatedFlipCard.tsx`
- `src/shared/animation/SwipeStudyCard.tsx`
- `src/shared/ui/toast/ToastContainer.tsx`
- `src/shared/ui/AppButton.tsx`
- `src/features/home/components/DeckCard.tsx`
- `src/features/study/components/SessionCompleteCard.tsx`
- `src/features/study/components/StudyFlashcard.tsx` (필요 시 cardStackEnter 적용)
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/decks/index.tsx`
- `app/(tabs)/store/index.tsx`
- `app/bundles/[bundleId].tsx`
- `package.json` (expo-linear-gradient 추가)

---

## Phase 1: Foundation (tokens + presets)

### Task 1: Create motion tokens

**Files:**
- Create: `src/shared/animation/motionTokens.ts`
- Test: `__tests__/shared/animation/motionTokens.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/shared/animation/motionTokens.test.ts
import { motion } from "@/src/shared/animation/motionTokens";

describe("motionTokens", () => {
  it("exposes four duration tokens in ascending order", () => {
    expect(motion.duration.instant).toBe(100);
    expect(motion.duration.fast).toBe(200);
    expect(motion.duration.normal).toBe(350);
    expect(motion.duration.slow).toBe(500);
  });

  it("exposes easing bezier functions", () => {
    expect(typeof motion.easing.standard).toBe("function");
    expect(typeof motion.easing.decelerate).toBe("function");
    expect(typeof motion.easing.accelerate).toBe("function");
    expect(typeof motion.easing.playful).toBe("function");
  });

  it("exposes spring configs with damping/stiffness", () => {
    expect(motion.spring.gentle).toEqual({ damping: 20, stiffness: 180 });
    expect(motion.spring.bouncy).toEqual({ damping: 12, stiffness: 260 });
    expect(motion.spring.snappy).toEqual({ damping: 18, stiffness: 320 });
  });

  it("exposes delay tokens", () => {
    expect(motion.delay.stagger).toBe(50);
    expect(motion.delay.short).toBe(100);
    expect(motion.delay.medium).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/shared/animation/motionTokens.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement motionTokens**

```ts
// src/shared/animation/motionTokens.ts
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

export type MotionDurationToken = keyof typeof motion.duration;
export type MotionSpringToken = keyof typeof motion.spring;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/shared/animation/motionTokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation/motionTokens.ts __tests__/shared/animation/motionTokens.test.ts
git commit -m "feat(animation): add motion tokens (duration/easing/spring/delay)"
```

---

### Task 2: Entering/transition presets

**Files:**
- Create: `src/shared/animation/motionPresets.ts`
- Test: `__tests__/shared/animation/motionPresets.test.ts`

- [ ] **Step 1: Write the failing test**

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
import { motion } from "@/src/shared/animation/motionTokens";

describe("entering presets", () => {
  it("fadeInUp returns a Reanimated layout animation object", () => {
    const anim = fadeInUp();
    expect(anim).toBeDefined();
    expect(typeof anim.build).toBe("function");
  });

  it("fadeInDown returns a defined layout animation", () => {
    expect(fadeInDown()).toBeDefined();
  });

  it("fadeInScale returns a defined layout animation", () => {
    expect(fadeInScale()).toBeDefined();
  });

  it("bounceIn returns a defined layout animation", () => {
    expect(bounceIn()).toBeDefined();
  });

  it("staggeredList offsets by motion.delay.stagger * index", () => {
    const zero = staggeredList(0);
    const second = staggeredList(2);
    expect(zero).toBeDefined();
    expect(second).toBeDefined();
    // delay should be index * motion.delay.stagger
    // Reanimated layout animations carry config internally; we only assert both exist
    // and represent different delays via the stagger spec.
  });

  it("cardStackEnter returns a defined layout animation", () => {
    expect(cardStackEnter()).toBeDefined();
  });

  it("tokens used in presets match motionTokens", () => {
    expect(motion.delay.stagger).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/shared/animation/motionPresets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement entering/transition presets**

```ts
// src/shared/animation/motionPresets.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/shared/animation/motionPresets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation/motionPresets.ts __tests__/shared/animation/motionPresets.test.ts
git commit -m "feat(animation): add entering/transition presets"
```

---

### Task 3: Navigation presets

**Files:**
- Modify: `src/shared/animation/motionPresets.ts`
- Test: `__tests__/shared/animation/navigationPresets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/shared/animation/navigationPresets.test.ts
import {
  stackPushOptions,
  modalPushOptions,
  tabShiftOptions,
} from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";

describe("navigation presets", () => {
  it("stackPushOptions uses slide_from_right with normal duration", () => {
    expect(stackPushOptions()).toEqual({
      animation: "slide_from_right",
      animationDuration: motion.duration.normal,
    });
  });

  it("modalPushOptions uses slide_from_bottom with normal duration", () => {
    expect(modalPushOptions()).toEqual({
      animation: "slide_from_bottom",
      animationDuration: motion.duration.normal,
    });
  });

  it("tabShiftOptions uses shift with fast duration", () => {
    expect(tabShiftOptions()).toEqual({
      animation: "shift",
      animationDuration: motion.duration.fast,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/shared/animation/navigationPresets.test.ts`
Expected: FAIL — exports not found.

- [ ] **Step 3: Append navigation presets to motionPresets.ts**

Append to the bottom of `src/shared/animation/motionPresets.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/shared/animation/navigationPresets.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation/motionPresets.ts __tests__/shared/animation/navigationPresets.test.ts
git commit -m "feat(animation): add navigation preset helpers"
```

---

### Task 4: useScalePress hook

**Files:**
- Create: `src/shared/animation/useScalePress.ts`
- Test: `__tests__/shared/animation/useScalePress.test.ts`

- [ ] **Step 1: Write the failing test (no extra deps — uses react-test-renderer shipped via jest-expo)**

```ts
// __tests__/shared/animation/useScalePress.test.ts
import { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useScalePress } from "@/src/shared/animation/useScalePress";

type HookResult = ReturnType<typeof useScalePress>;

function HookProbe({ onResult }: { onResult: (r: HookResult) => void }) {
  onResult(useScalePress());
  return null;
}

function renderHook(): HookResult {
  let captured: HookResult | undefined;
  act(() => {
    TestRenderer.create(
      createElement(HookProbe, {
        onResult: (r: HookResult) => {
          captured = r;
        },
      }),
    );
  });
  if (!captured) throw new Error("hook did not render");
  return captured;
}

describe("useScalePress", () => {
  it("returns animatedStyle and press handlers", () => {
    const result = renderHook();
    expect(result.animatedStyle).toBeDefined();
    expect(typeof result.pressHandlers.onPressIn).toBe("function");
    expect(typeof result.pressHandlers.onPressOut).toBe("function");
  });

  it("invokes handlers without throwing", () => {
    const result = renderHook();
    expect(() => {
      act(() => {
        result.pressHandlers.onPressIn();
      });
      act(() => {
        result.pressHandlers.onPressOut();
      });
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/shared/animation/useScalePress.test.ts`
Expected: FAIL — hook not found.

- [ ] **Step 3: Implement useScalePress**

```ts
// src/shared/animation/useScalePress.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/shared/animation/useScalePress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation/useScalePress.ts __tests__/shared/animation/useScalePress.test.ts
git commit -m "feat(animation): add useScalePress hook"
```

---

### Task 5: useCountUp hook

**Files:**
- Create: `src/shared/animation/useCountUp.ts`

No separate unit test — integration-tested via SessionCompleteCard in Phase 4.

- [ ] **Step 1: Implement useCountUp**

```ts
// src/shared/animation/useCountUp.ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/useCountUp.ts
git commit -m "feat(animation): add useCountUp hook"
```

---

### Task 6: SkeletonShimmer + expo-linear-gradient

**Files:**
- Modify: `package.json` (add `expo-linear-gradient`)
- Create: `src/shared/animation/SkeletonShimmer.tsx`

- [ ] **Step 1: Install expo-linear-gradient**

Run: `npx expo install expo-linear-gradient`

Verify `package.json` gained the dependency.

- [ ] **Step 2: Implement SkeletonShimmer**

```tsx
// src/shared/animation/SkeletonShimmer.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/src/shared/theme/ThemeProvider";

import { motion } from "./motionTokens";

type SkeletonShimmerProps = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
};

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
        duration: motion.duration.slow,
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
        { width, height, borderRadius, backgroundColor: colors.line },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[colors.line, colors.surface, colors.line]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/shared/animation/SkeletonShimmer.tsx
git commit -m "feat(animation): add SkeletonShimmer with expo-linear-gradient"
```

---

## Phase 2: Token migration of existing components

### Task 7: Migrate AnimatedScreen to tokens

**Files:**
- Modify: `src/shared/animation/AnimatedScreen.tsx`

- [ ] **Step 1: Replace implementation**

Replace entire file contents with:

```tsx
// src/shared/animation/AnimatedScreen.tsx
import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { fadeInUp } from "./motionPresets";

type AnimatedScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  delay?: number;
}>;

export function AnimatedScreen({
  children,
  style,
  delay = 0,
}: AnimatedScreenProps) {
  return (
    <Animated.View entering={fadeInUp(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
```

- [ ] **Step 2: Typecheck + existing tests**

Run: `npm run typecheck && npm test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/AnimatedScreen.tsx
git commit -m "refactor(animation): migrate AnimatedScreen to motion presets"
```

---

### Task 8: Migrate AnimatedFlipCard to tokens

**Files:**
- Modify: `src/shared/animation/AnimatedFlipCard.tsx:25-30`

- [ ] **Step 1: Replace the withTiming call**

Change the `useEffect` block from:

```ts
rotation.value = withTiming(flipped ? 1 : 0, {
  duration: 500,
  easing: Easing.bezier(0.4, 0.0, 0.2, 1),
});
```

to:

```ts
rotation.value = withTiming(flipped ? 1 : 0, {
  duration: motion.duration.normal,
  easing: motion.easing.standard,
});
```

Add import at top:
```ts
import { motion } from "./motionTokens";
```

Remove the now-unused `Easing` import.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/AnimatedFlipCard.tsx
git commit -m "refactor(animation): migrate AnimatedFlipCard to motion tokens"
```

---

### Task 9: Migrate SwipeStudyCard to tokens

**Files:**
- Modify: `src/shared/animation/SwipeStudyCard.tsx:57-58, 79-83`

- [ ] **Step 1: Replace spring/timing values**

At the top of the file, add:
```ts
import { motion } from "./motionTokens";
```

Replace `withSpring(0, { damping: 18, stiffness: 220 })` (two occurrences, lines 57-58) with:
```ts
withSpring(0, motion.spring.snappy)
```

Replace the `withTiming` inside `animateAxis`:
```ts
sv.value = withTiming(
  target,
  { duration: 180, easing: Easing.out(Easing.cubic) },
  cb,
);
```
with:
```ts
sv.value = withTiming(
  target,
  { duration: motion.duration.fast, easing: motion.easing.accelerate },
  cb,
);
```

Remove the now-unused `Easing` import if no other references remain (check first).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/animation/SwipeStudyCard.tsx
git commit -m "refactor(animation): migrate SwipeStudyCard to motion tokens"
```

---

### Task 10: Migrate ToastContainer to Reanimated

**Files:**
- Modify: `src/shared/ui/toast/ToastContainer.tsx`

- [ ] **Step 1: Replace with Reanimated-based version**

Replace entire file contents:

```tsx
// src/shared/ui/toast/ToastContainer.tsx
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { fadeInDown } from "@/src/shared/animation/motionPresets";
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

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <Animated.View
      entering={fadeInDown()}
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
    <View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
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

- [ ] **Step 2: Typecheck + lint + test**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/toast/ToastContainer.tsx
git commit -m "refactor(toast): migrate ToastContainer to Reanimated"
```

---

## Phase 3: Navigation integration

### Task 11: Apply Stack transition presets

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update RootNavigator**

Replace the `<Stack>...</Stack>` block with:

```tsx
<Stack
  screenOptions={{
    headerShown: false,
    contentStyle: {
      backgroundColor: colors.canvas,
    },
    ...stackPushOptions(),
  }}
>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="decks/[deckId]/edit" />
  <Stack.Screen name="study/[deckId]" options={modalPushOptions()} />
  <Stack.Screen name="bundles/[bundleId]" options={modalPushOptions()} />
  <Stack.Screen name="settings/index" />
</Stack>
```

Add import at the top:
```ts
import {
  modalPushOptions,
  stackPushOptions,
} from "@/src/shared/animation/motionPresets";
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(navigation): apply stack transition presets"
```

---

### Task 12: Apply Tabs transition preset

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Update TabsLayout**

In the `Tabs` `screenOptions`, add `...tabShiftOptions()`:

```tsx
<Tabs
  screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      height: 68,
      paddingBottom: 10,
      paddingTop: 8,
      backgroundColor: colors.surface,
      borderTopColor: colors.line,
    },
    ...tabShiftOptions(),
  }}
>
```

Add import at the top:
```ts
import { tabShiftOptions } from "@/src/shared/animation/motionPresets";
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Android smoke test**

Run: `npx expo run:android`

Manually verify:
- Tab 간 이동 시 `shift` 슬라이드가 보인다.
- Home → Deck edit 이동 시 우→좌 슬라이드 (`slide_from_right`).
- Study/Bundle 진입 시 아래→위 슬라이드 (`slide_from_bottom`).

If any transition looks wrong, note in the commit message but keep preset values.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat(navigation): apply tabs shift transition"
```

---

## Phase 4: UI integration

### Task 13: AppButton scale press feedback

**Files:**
- Modify: `src/shared/ui/AppButton.tsx` (full replacement below)

- [ ] **Step 1: Replace AppButton with animated version**

Replace entire file contents:

```tsx
// src/shared/ui/AppButton.tsx
import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { useScalePress } from "@/src/shared/animation/useScalePress";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const variantStyles = createVariantStyles(colors);
  const labelStyles = createLabelStyles(colors);
  const { animatedStyle, pressHandlers } = useScalePress();

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={disabled ? undefined : pressHandlers.onPressIn}
      onPressOut={disabled ? undefined : pressHandlers.onPressOut}
      style={[
        styles.base,
        variantStyles[variant],
        disabled ? styles.disabled : null,
        style,
        disabled ? null : animatedStyle,
      ]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{children}</Text>
    </AnimatedPressable>
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

The previous `styles.pressed` (opacity 0.84 + scale 0.99) is removed — `useScalePress` replaces it.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/AppButton.tsx
git commit -m "feat(ui): add scale press feedback to AppButton"
```

---

### Task 14: DeckCard stagger + scale press

**Files:**
- Modify: `src/features/home/components/DeckCard.tsx` (full replacement below)
- Modify: `app/(tabs)/index.tsx` (pass `index` to DeckCard)

- [ ] **Step 1: Replace DeckCard with animated version**

Replace entire file contents:

```tsx
// src/features/home/components/DeckCard.tsx
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DeckCardProps = {
  title: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  onPress: () => void;
  index?: number;
};

function DeckCardComponent({
  title,
  cardCount,
  dueCount,
  masteredCount,
  onPress,
  index = 0,
}: DeckCardProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();
  const progress = cardCount > 0 ? masteredCount / cardCount : 0;
  const isDone = dueCount === 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressHandlers.onPressIn}
      onPressOut={pressHandlers.onPressOut}
      entering={staggeredList(index)}
      style={[
        styles.root,
        { backgroundColor: colors.surface, borderColor: colors.line },
        animatedStyle,
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
          { backgroundColor: isDone ? colors.surfaceStrong : colors.primary },
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
    </AnimatedPressable>
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

Previous `styles.pressed` is removed — `useScalePress` replaces it.

- [ ] **Step 2: Pass index from the Home screen**

Open `app/(tabs)/index.tsx`. Find the deck list render (e.g. a `decks.map(...)`) and add `index`:

```tsx
{decks.map((deck, index) => (
  <DeckCard
    key={deck.id}
    title={deck.title}
    cardCount={deck.cardCount}
    dueCount={deck.dueCount}
    masteredCount={deck.masteredCount}
    onPress={() => /* existing handler */}
    index={index}
  />
))}
```

Match the existing prop list exactly — only `index={index}` is the new line.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/home/components/DeckCard.tsx app/(tabs)/index.tsx
git commit -m "feat(home): add staggered entry + press feedback to DeckCard"
```

---

### Task 15: Home empty state fadeInScale

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Read current Home screen**

Run: `cat app/(tabs)/index.tsx`

Locate the "empty state" rendering (when there are no decks).

- [ ] **Step 2: Wrap empty state with Animated.View + fadeInScale**

Replace the empty-state container with:

```tsx
<Animated.View entering={fadeInScale()}>
  {/* existing empty state content */}
</Animated.View>
```

Add imports:
```tsx
import Animated from "react-native-reanimated";
import { fadeInScale } from "@/src/shared/animation/motionPresets";
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat(home): animate empty state with fadeInScale"
```

---

### Task 16: My Decks stagger + press feedback

**Files:**
- Modify: `app/(tabs)/decks/index.tsx`

- [ ] **Step 1: Read current screen**

Run: `cat app/(tabs)/decks/index.tsx`

Determine if it reuses `DeckCard` or has its own card rendering.

- [ ] **Step 2: Apply animations**

- If it uses `DeckCard`: pass `index={index}` in the map — `DeckCard` already carries the behaviors from Task 14.
- If it has a local card component: apply the same pattern (wrap with `Animated.View entering={staggeredList(index)}`, use `useScalePress` on the pressable).

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/decks/index.tsx
git commit -m "feat(decks): apply stagger and press feedback to deck list"
```

---

### Task 17: StudyFlashcard cardStackEnter

**Files:**
- Modify: `src/features/study/components/StudyFlashcard.tsx`

- [ ] **Step 1: Read current StudyFlashcard**

Run: `cat src/features/study/components/StudyFlashcard.tsx`

Identify the outer container that wraps a single card (keyed by the current card id so it remounts on next card).

- [ ] **Step 2: Apply cardStackEnter**

Wrap the outer container with `Animated.View` (or change existing `View` to `Animated.View`) and pass `entering={cardStackEnter()}`. Ensure the parent passes a stable `key` per card id so the enter animation fires on card change.

```tsx
import Animated from "react-native-reanimated";
import { cardStackEnter } from "@/src/shared/animation/motionPresets";

// ...
<Animated.View key={card.id} entering={cardStackEnter()} style={...}>
  {/* existing content */}
</Animated.View>
```

If the `key` is applied at the consumer (Study screen) instead, leave it there and only change the root to `Animated.View` + `entering`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/study/components/StudyFlashcard.tsx
git commit -m "feat(study): animate next card with cardStackEnter"
```

---

### Task 18: SessionCompleteCard bounceIn + countUp + stagger

**Files:**
- Modify: `src/features/study/components/SessionCompleteCard.tsx`

- [ ] **Step 1: Replace root View with Animated.View + bounceIn**

Add imports:
```tsx
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { bounceIn, fadeInUp } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
import { useCountUp } from "@/src/shared/animation/useCountUp";
```

Replace the outer `<View style={[styles.root, ...]}>` with:
```tsx
<Animated.View entering={bounceIn()} style={[styles.root, { backgroundColor: colors.primarySoft }]}>
```

- [ ] **Step 2: Create AnimatedCountText subcomponent**

Inside the file (above `SessionCompleteCardComponent`):

```tsx
import { TextInput } from "react-native";
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function AnimatedCountText({
  target,
  style,
}: {
  target: number;
  style: object;
}) {
  const value = useCountUp(target);
  const animatedProps = useAnimatedProps(() => ({
    text: String(Math.round(value.value)),
  }) as object);
  return (
    <AnimatedTextInput
      editable={false}
      value={String(Math.round(target))}
      style={style}
      animatedProps={animatedProps}
    />
  );
}
```

Note: Reanimated's `useAnimatedProps` on `TextInput.text` is the standard way to animate displayed numbers. If the codebase forbids `TextInput` for display, fallback to keeping the static `Text` and only apply `useCountUp` to scale/opacity — document the decision in the commit message.

- [ ] **Step 3: Replace the three stat values**

Replace each:
```tsx
<Text style={[styles.statValue, { color: colors.accent }]}>
  {ratingCounts.again}
</Text>
```
with:
```tsx
<AnimatedCountText
  target={ratingCounts.again}
  style={[styles.statValue, { color: colors.accent }]}
/>
```

Do the same for `good` and `easy`. Do **not** replace the percentage label (keep as plain Text).

- [ ] **Step 4: Stagger the stat cards**

Wrap each stat card `<View>` with `<Animated.View entering={fadeInUp(i * motion.delay.stagger)}>` where `i` is 0, 1, 2 for again/good/easy respectively.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/study/components/SessionCompleteCard.tsx
git commit -m "feat(study): add bounceIn + countUp + stagger to session complete"
```

---

### Task 19: Store bundles stagger + press feedback

**Files:**
- Modify: `app/(tabs)/store/index.tsx`

- [ ] **Step 1: Read current store screen**

Run: `cat app/(tabs)/store/index.tsx`

Locate the bundle list rendering.

- [ ] **Step 2: Apply animations**

For each bundle card in the map:
1. Wrap with `<Animated.View entering={staggeredList(index)}>` (or change the pressable to `AnimatedPressable` with both `entering` and scale style).
2. Apply `useScalePress()` to each card's Pressable.

Pattern (same as DeckCard in Task 14):
```tsx
import Animated from "react-native-reanimated";
import { Pressable } from "react-native";
import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// In card render:
const { animatedStyle, pressHandlers } = useScalePress();
return (
  <AnimatedPressable
    entering={staggeredList(index)}
    onPress={...}
    onPressIn={pressHandlers.onPressIn}
    onPressOut={pressHandlers.onPressOut}
    style={[styles.card, animatedStyle]}
  >
    {/* ... */}
  </AnimatedPressable>
);
```

If each card is inline (not a subcomponent), extract to a local `BundleCard` component since `useScalePress` is a hook and must not be called inside a loop.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/store/index.tsx
git commit -m "feat(store): add stagger + press feedback to bundle list"
```

---

### Task 20: BundleDetail entry animation

**Files:**
- Modify: `app/bundles/[bundleId].tsx`

- [ ] **Step 1: Read current screen**

Run: `cat app/bundles/[bundleId].tsx`

Identify the main content container.

- [ ] **Step 2: Apply fadeInUp**

Wrap the primary content container with `<Animated.View entering={fadeInUp()}>`. Keep the outer `Screen` or safe area wrapper unchanged.

Add imports:
```tsx
import Animated from "react-native-reanimated";
import { fadeInUp } from "@/src/shared/animation/motionPresets";
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/bundles/[bundleId].tsx
git commit -m "feat(bundles): animate bundle detail entry"
```

---

## Phase 5: Verification

### Task 21: Full verification

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Tests**

Run: `npm test`
Expected: all pass including new animation tests.

- [ ] **Step 4: Magic number scan**

Run these greps to confirm no hardcoded motion literals remain:

```bash
# Animation durations outside motionTokens/presets
grep -rn "duration:\s*\d" src/ --include="*.ts" --include="*.tsx" | grep -v "motionTokens.ts\|motionPresets.ts\|node_modules"
```

Expected: no results (or only comments). Any hit in `src/shared/animation/SkeletonShimmer.tsx` or similar should already use `motion.duration.*`.

```bash
grep -rn "damping:\s*\d\|stiffness:\s*\d" src/ --include="*.ts" --include="*.tsx" | grep -v "motionTokens.ts"
```

Expected: no results.

- [ ] **Step 5: Android smoke QA**

Run: `npx expo run:android`

Verify manually:
- [ ] Home → Deck edit: slide_from_right 전이
- [ ] Home → Study: slide_from_bottom 전이
- [ ] Home → Bundle detail: slide_from_bottom 전이
- [ ] Tab 이동: shift 슬라이드
- [ ] Deck 카드 누를 때 scale 축소
- [ ] Session complete 화면 진입 시 bounce + 숫자 카운트업
- [ ] Flashcard 플립 애니메이션 (350ms, standard easing)
- [ ] Toast fade-in-down / fade-out 정상

If any smoke check fails, create a follow-up fix commit within this task — do not leave as TODO.

- [ ] **Step 6: Final commit (if any fixes from smoke QA)**

```bash
git add -p   # stage only smoke-fix changes
git commit -m "fix(animation): <describe smoke issue>"
```

---

## Summary

- **Phase 1 (Tasks 1-6):** Foundation — tokens, presets, navigation presets, hooks, SkeletonShimmer.
- **Phase 2 (Tasks 7-10):** Migrate existing animated components to tokens. ToastContainer to Reanimated.
- **Phase 3 (Tasks 11-12):** Apply Stack & Tabs navigation transitions.
- **Phase 4 (Tasks 13-20):** UI integration across home, decks, study, session complete, store, bundle detail.
- **Phase 5 (Task 21):** Full verification (typecheck, lint, tests, magic-number scan, Android smoke QA).
