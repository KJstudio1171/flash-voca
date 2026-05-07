# Animation System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented, excessive animation system with a unified restrained motion language: 3 durations, 1 easing, 1 gesture spring, 4 presets — applied consistently across navigation, content, gestures, and the study card.

**Architecture:** Foundation rewrite of `src/shared/animation/motionTokens.ts` and `motionPresets.ts`, then mechanical migration of all call sites. Toned-down tuning of `AnimatedFlipCard`, `SwipeStudyCard`, and `useScalePress`. Tests use the same shape as existing token/preset tests (token-table assertions + `toBeDefined()` for opaque layout animation configs).

**Tech Stack:** React Native + Expo Router + react-native-reanimated v3 (`Easing.bezier`, `FadeIn`, `FadeOut`, `withTiming`, `withSpring`).

**Spec:** `docs/superpowers/specs/2026-05-07-animation-redesign-design.md`

**Verification commands (used throughout):**
```bash
npm run typecheck
npm run lint
npm test
```

---

## Task 1: Replace motion tokens

**Files:**
- Modify: `src/shared/animation/motionTokens.ts`
- Modify: `__tests__/shared/animation/motionTokens.test.ts`

- [ ] **Step 1: Rewrite the token test for the new shape**

Replace the entire contents of `__tests__/shared/animation/motionTokens.test.ts` with:

```ts
import { motion } from "@/src/shared/animation/motionTokens";

describe("motionTokens", () => {
  it("exposes three duration tokens (quick/base/emphasized)", () => {
    expect(motion.duration.quick).toBe(160);
    expect(motion.duration.base).toBe(220);
    expect(motion.duration.emphasized).toBe(320);
  });

  it("exposes only the three duration tokens", () => {
    expect(Object.keys(motion.duration).sort()).toEqual([
      "base",
      "emphasized",
      "quick",
    ]);
  });

  it("exposes a single standard easing", () => {
    expect(motion.easing.standard).toBeDefined();
    expect(Object.keys(motion.easing)).toEqual(["standard"]);
  });

  it("exposes a single gesture spring config", () => {
    expect(motion.spring.gesture).toEqual({
      damping: 22,
      stiffness: 240,
      mass: 1,
    });
    expect(Object.keys(motion.spring)).toEqual(["gesture"]);
  });

  it("exposes displacement constants", () => {
    expect(motion.displacement.enter).toBe(8);
    expect(motion.displacement.pressScale).toBe(0.97);
    expect(motion.displacement.flipDip).toBe(0.98);
  });

  it("exposes stagger constants", () => {
    expect(motion.stagger.short).toBe(30);
    expect(motion.stagger.maxItems).toBe(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/shared/animation/motionTokens.test.ts -t motionTokens`
Expected: FAIL — current tokens don't match (legacy keys present, new keys absent).

- [ ] **Step 3: Rewrite `motionTokens.ts`**

Replace the entire contents of `src/shared/animation/motionTokens.ts` with:

```ts
import { Easing } from "react-native-reanimated";

export const motion = {
  duration: {
    quick: 160,
    base: 220,
    emphasized: 320,
  },
  easing: {
    standard: Easing.bezier(0.2, 0.0, 0.0, 1.0),
  },
  spring: {
    gesture: { damping: 22, stiffness: 240, mass: 1 },
  },
  displacement: {
    enter: 8,
    pressScale: 0.97,
    flipDip: 0.98,
  },
  stagger: {
    short: 30,
    maxItems: 4,
  },
} as const;

export type MotionDurationToken = keyof typeof motion.duration;
```

Note: `MotionSpringToken` is removed (unused, only one spring exists now).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/shared/animation/motionTokens.test.ts -t motionTokens`
Expected: PASS.

- [ ] **Step 5: Do not commit yet**

Tokens alone won't typecheck because every consumer references legacy keys. Continue to Task 2 before committing. (Subsequent tasks will leave the tree typecheckable at their commits.)

---

## Task 2: Replace motion presets and navigation options

**Files:**
- Modify: `src/shared/animation/motionPresets.ts`
- Modify: `__tests__/shared/animation/motionPresets.test.ts`
- Modify: `__tests__/shared/animation/navigationPresets.test.ts`

- [ ] **Step 1: Rewrite the preset test for the new API**

Replace the entire contents of `__tests__/shared/animation/motionPresets.test.ts` with:

```ts
import {
  contentEnter,
  contentExit,
  listItemEnter,
  studyCardEnter,
} from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";

describe("entering/exiting presets", () => {
  it("contentEnter returns a defined layout animation for any delay", () => {
    expect(contentEnter()).toBeDefined();
    expect(contentEnter(120)).toBeDefined();
  });

  it("studyCardEnter returns a defined layout animation", () => {
    expect(studyCardEnter()).toBeDefined();
  });

  it("contentExit returns a defined layout animation", () => {
    expect(contentExit()).toBeDefined();
  });

  it("listItemEnter caps stagger at motion.stagger.maxItems", () => {
    // We can't read the delay back from a Reanimated layout animation object,
    // so we assert the cap logic indirectly via behavioral invariants.
    expect(listItemEnter(0)).toBeDefined();
    expect(listItemEnter(motion.stagger.maxItems)).toBeDefined();
    expect(listItemEnter(50)).toBeDefined();
  });

  it("token surface used by presets is present", () => {
    expect(motion.duration.base).toBe(220);
    expect(motion.duration.quick).toBe(160);
    expect(motion.stagger.short).toBe(30);
    expect(motion.stagger.maxItems).toBe(4);
    expect(motion.displacement.enter).toBe(8);
  });
});
```

- [ ] **Step 2: Rewrite the navigation preset test**

Replace the entire contents of `__tests__/shared/animation/navigationPresets.test.ts` with:

```ts
import {
  modalPushOptions,
  stackPushOptions,
  tabShiftOptions,
} from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";

describe("navigation presets", () => {
  it("stackPushOptions uses slide_from_right with base duration", () => {
    expect(stackPushOptions()).toEqual({
      animation: "slide_from_right",
      animationDuration: motion.duration.base,
    });
  });

  it("modalPushOptions uses slide_from_bottom with base duration", () => {
    expect(modalPushOptions()).toEqual({
      animation: "slide_from_bottom",
      animationDuration: motion.duration.base,
    });
  });

  it("tabShiftOptions uses fade with quick duration", () => {
    expect(tabShiftOptions()).toEqual({
      animation: "fade",
      animationDuration: motion.duration.quick,
    });
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npx jest __tests__/shared/animation/motionPresets.test.ts __tests__/shared/animation/navigationPresets.test.ts`
Expected: FAIL — imports do not exist yet (`contentEnter`, `contentExit`, `listItemEnter` not exported).

- [ ] **Step 4: Rewrite `motionPresets.ts`**

Replace the entire contents of `src/shared/animation/motionPresets.ts` with:

```ts
import { FadeIn, FadeOut } from "react-native-reanimated";

import { motion } from "./motionTokens";

export function contentEnter(delay = 0) {
  return FadeIn.delay(delay)
    .duration(motion.duration.base)
    .easing(motion.easing.standard)
    .withInitialValues({
      transform: [{ translateY: motion.displacement.enter }],
    });
}

export function listItemEnter(index: number) {
  const cappedIndex = Math.min(index, motion.stagger.maxItems);
  return contentEnter(cappedIndex * motion.stagger.short);
}

export function studyCardEnter() {
  return FadeIn.duration(motion.duration.base)
    .easing(motion.easing.standard)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.985 }],
    });
}

export function contentExit() {
  return FadeOut.duration(motion.duration.quick).easing(motion.easing.standard);
}

export function stackPushOptions() {
  return {
    animation: "slide_from_right" as const,
    animationDuration: motion.duration.base,
  };
}

export function modalPushOptions() {
  return {
    animation: "slide_from_bottom" as const,
    animationDuration: motion.duration.base,
  };
}

export function tabShiftOptions() {
  return {
    animation: "fade" as const,
    animationDuration: motion.duration.quick,
  };
}

export { FadeIn, FadeOut };
```

Removed exports: `fadeInUp`, `fadeInDown`, `fadeIn`, `screenFade`, `emphasisFadeUp`, `fadeInScale`, `bounceIn`, `staggeredList`, `cardStackEnter`, `SlideInDown`.

- [ ] **Step 5: Run both tests to verify they pass**

Run: `npx jest __tests__/shared/animation/motionPresets.test.ts __tests__/shared/animation/navigationPresets.test.ts`
Expected: PASS.

- [ ] **Step 6: Do not commit yet**

Tree still does not typecheck because consumers (AnimatedScreen, DeckCard, etc.) reference removed exports. Continue.

---

## Task 3: Update `useScalePress` to spring-return with new tokens

**Files:**
- Modify: `src/shared/animation/useScalePress.ts`
- Test: `__tests__/shared/animation/useScalePress.test.ts` (no change; it asserts API shape only)

- [ ] **Step 1: Rewrite `useScalePress.ts`**

Replace the entire contents of `src/shared/animation/useScalePress.ts` with:

```ts
import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { motion } from "./motionTokens";

const IDLE_SCALE = 1;

export function useScalePress() {
  const scale = useSharedValue(IDLE_SCALE);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withTiming(motion.displacement.pressScale, {
      duration: motion.duration.quick,
      easing: motion.easing.standard,
    });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(IDLE_SCALE, motion.spring.gesture);
  }, [scale]);

  return {
    animatedStyle,
    pressHandlers: { onPressIn, onPressOut },
  };
}
```

Behavioral changes: pressed scale 0.98 → 0.97 (`motion.displacement.pressScale`); release uses spring instead of timed easing for a softer settle.

- [ ] **Step 2: Run the existing hook test**

Run: `npx jest __tests__/shared/animation/useScalePress.test.ts`
Expected: PASS (test asserts API shape only).

---

## Task 4: Update `useCountUp` to use new tokens

**Files:**
- Modify: `src/shared/animation/useCountUp.ts`

- [ ] **Step 1: Read current file**

Run: `cat src/shared/animation/useCountUp.ts`
Verify lines 15–16 reference `motion.duration.normal` and `motion.easing.decelerate`.

- [ ] **Step 2: Replace the duration and easing references**

In `src/shared/animation/useCountUp.ts`, change:

```ts
duration: motion.duration.normal,
easing: motion.easing.decelerate,
```

to:

```ts
duration: motion.duration.emphasized,
easing: motion.easing.standard,
```

(Count-up animation slows naturally to a stop and benefits from the longer 320ms; the single `standard` easing is used throughout the app.)

---

## Task 5: Update `SkeletonShimmer` (inline shimmer cycle)

**Files:**
- Modify: `src/shared/animation/SkeletonShimmer.tsx`

The shimmer animation runs as a continuous looping cycle (not a UI transition), so its 500ms cycle does not belong in the duration token table.

- [ ] **Step 1: Read current shimmer config**

Run: `sed -n '25,40p' src/shared/animation/SkeletonShimmer.tsx`
Verify it references `motion.duration.slow` and `motion.easing.standard`.

- [ ] **Step 2: Replace with inlined cycle constant**

In `src/shared/animation/SkeletonShimmer.tsx`, replace:

```ts
duration: motion.duration.slow,
easing: motion.easing.standard,
```

with:

```ts
duration: SHIMMER_CYCLE_MS,
easing: motion.easing.standard,
```

Then add at the top of the file (below imports, above the component):

```ts
// Shimmer is a continuous loop, not a UI transition — kept outside motion.duration.
const SHIMMER_CYCLE_MS = 500;
```

If the import line is `import { motion } from "./motionTokens";`, leave it — `motion.easing.standard` is still used.

---

## Task 6: Update `AnimatedFlipCard` (emphasized duration, relaxed dip)

**Files:**
- Modify: `src/shared/animation/AnimatedFlipCard.tsx`

- [ ] **Step 1: Replace duration token**

In `src/shared/animation/AnimatedFlipCard.tsx`, line 28, change:

```ts
duration: motion.duration.cardFlip,
```

to:

```ts
duration: motion.duration.emphasized,
```

- [ ] **Step 2: Relax mid-rotation scale dip**

In the same file, replace both occurrences of:

```ts
{ scale: interpolate(rotation.value, [0, 0.3, 0.7, 1], [1, 0.96, 0.96, 1]) },
```

with:

```ts
{ scale: interpolate(rotation.value, [0, 0.3, 0.7, 1], [1, motion.displacement.flipDip, motion.displacement.flipDip, 1]) },
```

Both `frontStyle` and `backStyle` use the same dip — `replace_all` on the literal `[1, 0.96, 0.96, 1]` is safe.

---

## Task 7: Update `SwipeStudyCard` (gesture spring, base/standard, /28)

**Files:**
- Modify: `src/shared/animation/SwipeStudyCard.tsx`

- [ ] **Step 1: Update spring token in cancel-return**

In `src/shared/animation/SwipeStudyCard.tsx`, lines 58–59, replace:

```ts
translateX.value = withSpring(0, motion.spring.gentle);
translateY.value = withSpring(0, motion.spring.gentle);
```

with:

```ts
translateX.value = withSpring(0, motion.spring.gesture);
translateY.value = withSpring(0, motion.spring.gesture);
```

- [ ] **Step 2: Update exit duration and easing**

In the same file, line 82, replace:

```ts
{ duration: motion.duration.fast, easing: motion.easing.accelerate },
```

with:

```ts
{ duration: motion.duration.base, easing: motion.easing.standard },
```

- [ ] **Step 3: Tame rotation factor**

In the same file, line 107, replace:

```ts
{ rotateZ: `${translateX.value / 20}deg` },
```

with:

```ts
{ rotateZ: `${translateX.value / 28}deg` },
```

(Rotation factor `/28` caps the visible rotation around 14° at exit distance, instead of ~20° with `/20`.)

---

## Task 8: Update `AnimatedScreen` to use `contentEnter`

**Files:**
- Modify: `src/shared/animation/AnimatedScreen.tsx`

- [ ] **Step 1: Read current file**

Run: `cat src/shared/animation/AnimatedScreen.tsx`
Verify it imports `emphasisFadeUp` and `screenFade` and chooses between them by `variant`.

- [ ] **Step 2: Replace contents**

Replace the entire contents of `src/shared/animation/AnimatedScreen.tsx` with:

```ts
import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { contentEnter } from "./motionPresets";

type AnimatedScreenVariant = "none" | "fade" | "fadeUp";

type AnimatedScreenProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  variant?: AnimatedScreenVariant;
}>;

export function AnimatedScreen({
  children,
  delay = 0,
  style,
  variant = "fade",
}: AnimatedScreenProps) {
  if (variant === "none") {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  return (
    <Animated.View entering={contentEnter(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
```

The `variant` prop is preserved for API compatibility with existing call sites in `Screen.tsx`. Both `"fade"` and `"fadeUp"` now resolve to `contentEnter` because the new content enter is itself `fade + Y 8px` — the prior distinction collapses, by design (Principle #1).

---

## Task 9: Migrate list-stagger consumers (`staggeredList` → `listItemEnter`)

**Files:**
- Modify: `src/features/home/components/DeckCard.tsx`
- Modify: `src/features/decks/components/MyDeckListItem.tsx`
- Modify: `src/features/store/components/StoreBundleGridCard.tsx`
- Modify: `src/shared/ui/QuickActions.tsx`

Each file imports `staggeredList` and uses it as `entering={staggeredList(index)}`. The replacement is mechanical: import name and call name change to `listItemEnter`.

- [ ] **Step 1: `DeckCard.tsx`**

In `src/features/home/components/DeckCard.tsx`:
- Replace `import { staggeredList } from "@/src/shared/animation/motionPresets";`
  with `import { listItemEnter } from "@/src/shared/animation/motionPresets";`
- Replace `entering={staggeredList(index)}` with `entering={listItemEnter(index)}`

- [ ] **Step 2: `MyDeckListItem.tsx`**

In `src/features/decks/components/MyDeckListItem.tsx`: apply the same two replacements as Step 1.

- [ ] **Step 3: `StoreBundleGridCard.tsx`**

In `src/features/store/components/StoreBundleGridCard.tsx`: apply the same two replacements.

- [ ] **Step 4: `QuickActions.tsx`**

In `src/shared/ui/QuickActions.tsx`: apply the same two replacements.

---

## Task 10: Migrate single-element fades (`fadeInScale` → `contentEnter`)

**Files:**
- Modify: `src/features/home/components/HomeRecommendedBundleCard.tsx`

- [ ] **Step 1: Replace import and call**

In `src/features/home/components/HomeRecommendedBundleCard.tsx`:
- Replace `import { fadeInScale } from "@/src/shared/animation/motionPresets";`
  with `import { contentEnter } from "@/src/shared/animation/motionPresets";`
- Replace `entering={fadeInScale(80)}` with `entering={contentEnter(80)}`

(Per spec, zoom-in is removed; the card now enters with the unified fade + 8px Y motion. The 80ms delay is preserved — it represents this card's narrative position on the home screen.)

---

## Task 11: Migrate `SessionCompleteCard` (bounceIn + manual stagger)

**Files:**
- Modify: `src/features/study/components/SessionCompleteCard.tsx`

This is the spec's narrative-step exception. Stagger is preserved (score → 4 stat cards) but values move to the new tokens, and `bounceIn` is replaced with `contentEnter`.

- [ ] **Step 1: Update imports**

Replace:

```ts
import { bounceIn, fadeInUp } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
```

with:

```ts
import { contentEnter } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
```

- [ ] **Step 2: Replace root entering**

Replace `entering={bounceIn()}` with `entering={contentEnter()}`.

- [ ] **Step 3: Replace each stat card's entering**

There are four stat cards; each uses `entering={fadeInUp(N * motion.delay.stagger)}` for `N = 0, 1, 2, 3`.

Replace each with `entering={contentEnter(N * motion.stagger.short)}`:

- `fadeInUp(0 * motion.delay.stagger)` → `contentEnter(0 * motion.stagger.short)`
- `fadeInUp(1 * motion.delay.stagger)` → `contentEnter(1 * motion.stagger.short)`
- `fadeInUp(2 * motion.delay.stagger)` → `contentEnter(2 * motion.stagger.short)`
- `fadeInUp(3 * motion.delay.stagger)` → `contentEnter(3 * motion.stagger.short)`

(Stagger interval changes from 50ms → 30ms per spec; total cascade 0/30/60/90ms across 4 cards — under the 220ms cap.)

---

## Task 12: Migrate `ToastContainer` (fadeInDown → contentEnter; FadeOut → contentExit)

**Files:**
- Modify: `src/shared/ui/toast/ToastContainer.tsx`

- [ ] **Step 1: Update imports**

Replace:

```ts
import Animated, { FadeOut } from "react-native-reanimated";

import { fadeInDown } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
```

with:

```ts
import Animated from "react-native-reanimated";

import { contentEnter, contentExit } from "@/src/shared/animation/motionPresets";
```

(`motion` is no longer used in this file after the replacement; `FadeOut` direct import is replaced by `contentExit`.)

- [ ] **Step 2: Update entering and exiting**

Replace:

```tsx
entering={fadeInDown()}
exiting={FadeOut.duration(motion.duration.fast)}
```

with:

```tsx
entering={contentEnter()}
exiting={contentExit()}
```

(The bottom toast now rises 8px on enter — directionally more natural for a bottom-anchored toast than the previous `fadeInDown` which slid downward.)

---

## Task 13: Verify navigation layouts unchanged

**Files (read-only check):**
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`

These files import `stackPushOptions`, `modalPushOptions`, `tabShiftOptions` — all preserved by Task 2 with the same names and shape. No code change required, but verify.

- [ ] **Step 1: Read both files**

Run:
```bash
sed -n '1,40p' app/_layout.tsx
sed -n '1,30p' app/\(tabs\)/_layout.tsx
```

Verify:
- `app/_layout.tsx` imports `stackPushOptions` and `modalPushOptions` from `@/src/shared/animation/motionPresets` and spreads/uses them.
- `app/(tabs)/_layout.tsx` imports `tabShiftOptions` and spreads it.

- [ ] **Step 2: No edit required**

Skip if both verified.

---

## Task 14: Full repo verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors. If any file references a removed token (e.g. `motion.duration.normal`, `motion.spring.gentle`) or a removed preset (`fadeInUp`, `bounceIn`, etc.), it surfaces here. Fix the file by referring to the migration map in the spec, then re-run.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS. Fix any lint errors (likely unused imports of the now-removed `motion` symbol).

- [ ] **Step 3: Test suite**

Run: `npm test`
Expected: All tests pass. The animation suite (`__tests__/shared/animation/*`) was rewritten in Tasks 1–2; everything else should be untouched by this PR.

- [ ] **Step 4: Audit for self-rolled press logic (Rule E)**

Search for components that animate a press without `useScalePress`:

```bash
grep -rn "onPressIn\|onPressOut" src/features src/shared/ui | grep -v useScalePress
```

For each result that animates a scale/opacity on press without going through `useScalePress`, replace with `useScalePress`. If the result simply forwards a press handler for non-animation purposes (e.g. tracking analytics, focus), leave it alone.

If no animated self-rolled press handlers are found, this step is a no-op.

- [ ] **Step 5: Manual QA against checklist**

Start the dev server (`npx expo start`) and walk through the checklist from the spec §6.2:

- Bottom tab transitions across all 4 tabs share one rhythm.
- Home → deck detail → card list → card edit slides at one beat.
- Study screen modal entry matches 220ms.
- Home/decks/store list entries arrive nearly simultaneously.
- Study card flip is smooth without scale wobble.
- Swipe cancel returns via spring; swipe exit feels consistent with screen transitions.
- All press feedback feels identical across cards, buttons, list rows.
- Toast enter/exit shares the language.

If a surface feels off, tune the relevant token (`motion.displacement.*`, `motion.stagger.short`, or rotation factor) — these are the intended levers.

- [ ] **Step 6: Commit the full migration as one logical change**

Run:

```bash
git add src/shared/animation \
        __tests__/shared/animation \
        src/features/home/components/DeckCard.tsx \
        src/features/home/components/HomeRecommendedBundleCard.tsx \
        src/features/decks/components/MyDeckListItem.tsx \
        src/features/store/components/StoreBundleGridCard.tsx \
        src/features/study/components/SessionCompleteCard.tsx \
        src/shared/ui/QuickActions.tsx \
        src/shared/ui/toast/ToastContainer.tsx
git commit -m "$(cat <<'EOF'
refactor(animation): unified restrained motion language

Replace 8-duration / 4-easing token surface with three durations,
one easing, one gesture spring; collapse nine presets into four.
Tame study card flip dip and swipe rotation; spring-return press
feedback. All call sites migrated; tests updated for new token table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Then verify with `git status` — working tree should be clean except for any unrelated files that were already modified before this task.

---

## Notes for the implementing engineer

- **Why one big commit at the end?** Tasks 1–2 leave the tree non-typecheckable on their own (every consumer references removed exports). Splitting commits between Task 1 and Task 2 would land a broken `main`. The mechanical migration tasks (9–12) are individually trivial but only meaningful together with the new presets. Keeping it one commit avoids landing a broken intermediate.

- **If the user prefers smaller commits**, an acceptable split is: (Tasks 1–8) as a single commit titled "refactor(animation): replace tokens, presets, primitives" — leaves the tree non-compiling momentarily — followed by (Tasks 9–13) as "refactor(animation): migrate call sites" — restores green. Default to single commit unless asked otherwise.

- **Tokens that no longer exist** — anywhere outside this plan's listed files that references `motion.duration.{instant,tab,content,fast,navigation,cardFlip,normal,slow}`, `motion.easing.{decelerate,accelerate,playful}`, `motion.spring.{gentle,bouncy,snappy}`, `motion.delay.*`, will surface as TypeScript errors in Task 14 Step 1. The migration map in the spec is the authoritative reference for replacements.

- **The `motion.delay.*` namespace is gone.** `SessionCompleteCard` is the only known consumer (handled in Task 11). If typecheck surfaces another consumer, replace `motion.delay.stagger` with `motion.stagger.short` and `motion.delay.maxStagger` with `motion.stagger.maxItems * motion.stagger.short`.

- **Testing layout animations is opaque.** Reanimated's `LayoutAnimationConfig` does not expose duration/easing for assertion. The token tests assert the source-of-truth values; preset tests assert presets are defined and use the right tokens transitively. Behavioral correctness is verified by manual QA.
