# Animation System Redesign

**Date:** 2026-05-07
**Status:** Design — pending implementation
**Scope:** `src/shared/animation/*`, all call sites in `src/features/**` and `app/**`, navigation options.

## Problem

Current animation system feels "조잡함" (crude/cluttered) compared to Toss-class learning apps. Two specific failures:

1. **Motion fragments across engines** — tabs use native `fade`, stack uses native `slide_from_right`, content uses Reanimated `fadeInUp`, lists use `staggeredList`, study card uses `scale`. Each surface speaks a different motion language.
2. **Motion is excessive** — 8 duration tokens with overlapping semantics, 4 easing curves (only one in real use), `bounceIn`/`fadeInScale`/`playful` variants, mechanical 50ms × n stagger that visibly cascades.

Symptoms in code:
- `motionTokens.ts`: 8 durations (`instant/tab/content/fast/navigation/cardFlip/normal/slow`), 4 easings, 3 springs (most unused).
- `motionPresets.ts`: 9 functions including 1:1 aliases (`screenFade = fadeIn`, `emphasisFadeUp = fadeInUp`, `cardStackEnter = studyCardEnter`).
- ~12 call sites across screens/components consume this surface inconsistently.

## Goals

A unified, restrained motion language across navigation, content, gestures, and the study card. Reduce token surface area drastically. Eliminate visible stagger and zoom/bounce variants. Preserve study-card physicality (flip, swipe) but tame its overshoot.

## Non-Goals

- New transition types (shared element, hero).
- Theme-conditional motion.
- Reduced Motion accessibility support — separate future work.
- Haptic feedback — orthogonal, separate work.
- Touching `BillingGateway`, sync, or any non-animation foundation module.

## Principles

1. **One language.** Navigation, content, press feedback, and study card share one duration scale, one easing curve, one displacement scale. The user must not feel "different engines."
2. **Restraint by default.** Enter motion is `fade + Y 8px`. Scale changes are subtle (0.97–1.0). Larger physical motion (zoom, rotation) is reserved for explicitly physical interactions (study card flip/swipe).
3. **Three timings, one curve.** `quick / base / emphasized` durations + a single Material 3 "emphasized" easing. No choice paralysis. Spring is reserved for gesture return.
4. **Invisible motion is good motion.** Stagger, delay chains, and emphasis are removed by default. Content is the subject; motion only stitches it.

## Design

### Tokens — `src/shared/animation/motionTokens.ts`

```ts
export const motion = {
  duration: {
    quick: 160,        // press release, toast, chip, switch
    base: 220,         // stack push, tab shift, modal, content enter, swipe exit
    emphasized: 320,   // study card flip; explicit physical gestures
  },
  easing: {
    standard: Easing.bezier(0.2, 0.0, 0.0, 1.0), // Material 3 emphasized
  },
  spring: {
    gesture: { damping: 22, stiffness: 240, mass: 1 }, // swipe cancel, press return
  },
  displacement: {
    enter: 8,          // Y translate for content enter (px)
    pressScale: 0.97,  // press feedback scale
    flipDip: 0.98,     // flip mid-rotation scale dip
  },
  stagger: {
    short: 30,         // first few list items
    maxItems: 4,       // items beyond this share the cap delay
  },
} as const;
```

**Removed:** `instant`, `tab`, `content`, `fast`, `navigation`, `cardFlip`, `normal`, `slow`; `decelerate`, `accelerate`, `playful`; `gentle`, `bouncy`, `snappy`; `delay.medium`, `delay.maxStagger`, `delay.short`.

### Presets — `src/shared/animation/motionPresets.ts`

```ts
export function contentEnter(delay = 0) {
  return FadeIn.delay(delay)
    .duration(motion.duration.base)
    .easing(motion.easing.standard)
    .withInitialValues({ transform: [{ translateY: motion.displacement.enter }] });
}

export function listItemEnter(index: number) {
  const cappedIndex = Math.min(index, motion.stagger.maxItems);
  return contentEnter(cappedIndex * motion.stagger.short);
}

export function studyCardEnter() {
  return FadeIn.duration(motion.duration.base)
    .easing(motion.easing.standard)
    .withInitialValues({ opacity: 0, transform: [{ scale: 0.985 }] });
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

**Removed:** `fadeInUp`, `fadeInDown`, `fadeIn` (re-export only), `screenFade`, `emphasisFadeUp`, `fadeInScale`, `bounceIn`, `staggeredList`, `cardStackEnter`.

**Migration map:**
| Before | After |
|---|---|
| `fadeInUp(d)`, `emphasisFadeUp(d)`, `fadeIn(d)`, `screenFade(d)`, `fadeInDown(d)` | `contentEnter(d)` |
| `staggeredList(i)` | `listItemEnter(i)` |
| `fadeInScale(d)`, `bounceIn(d)` | `contentEnter(d)` |
| `cardStackEnter()` | `studyCardEnter()` |

### Call-site rules

**Rule A — Mechanical replacement.** Apply migration map to all imports/calls. Affected files (from search):
- `src/features/home/screens/HomeScreen.tsx`, `src/features/home/components/{HomeRecommendedBundleCard,DeckCard}.tsx`
- `src/features/decks/screens/MyDecksScreen.tsx`, `src/features/decks/components/MyDeckListItem.tsx`
- `src/features/store/screens/{StoreScreen,BundleDetailScreen}.tsx`, `src/features/store/components/StoreBundleGridCard.tsx`
- `src/features/study/screens/{StudyHubScreen,StudyScreen}.tsx`, `src/features/study/components/{SessionCompleteCard,StudyFlashcard}.tsx`
- `src/shared/ui/QuickActions.tsx`, `src/shared/ui/Screen.tsx`, `src/shared/ui/toast/ToastContainer.tsx`
- `src/shared/animation/AnimatedScreen.tsx`
- `app/_layout.tsx`, `app/(tabs)/_layout.tsx`

**Rule B — Magic-number lift.** Inline `withTiming(v, { duration: 250 })` or scale literals (`0.96`, `0.92`) inside components must move to `motion.*` tokens.

**Rule C — Stagger cap audit.** Anywhere `staggeredList(i)` is used, confirm whether stagger is desirable at all. If the surface is a single card or header (not a list), replace with `contentEnter()` instead of `listItemEnter()`.

**Rule D — Cascade removal.** Explicit `delay` chains across siblings ("header → card1 → card2 → CTA") are removed. Siblings on the same screen enter together with `contentEnter(0)`. Exception: narrative steps such as `SessionCompleteCard` (score → reward → button) keep staged delays, but each step's delay must not exceed `motion.duration.base` (220ms).

**Rule E — Press feedback.** All pressables/cards use `useScalePress` (scale → 0.97, spring return). Components with their own `onPressIn/onPressOut` + `withTiming` press logic are converted to use the hook.

### Study card

**`studyCardEnter`** — duration `base` (220ms), single `standard` easing, scale 0.985 → 1 preserved. Aligns the card-enter beat with screen transitions.

**`AnimatedFlipCard`** — duration `emphasized` (320ms), single `standard` easing. Mid-dip relaxed from 0.96 → `motion.displacement.flipDip` (0.98) to remove the visible scale wobble. Crossfade at 0.5 unchanged (required for `backfaceVisibility`).

**`SwipeStudyCard`** —
- Cancel return uses `motion.spring.gesture` (single spring token).
- Exit uses `motion.duration.base` (220ms) + `motion.easing.standard` (replaces `fast` + `accelerate`).
- Rotation factor `translateX / 20` → `translateX / 28` (max ~14° instead of ~20°).
- Drag-time scale, opacity, glow, and label logic unchanged — they are user-facing, proportional, and well-tuned.

### Testing

- `__tests__/shared/animation/motionTokens.test.ts` — assert token table shape; assert legacy keys absent (`instant`, `cardFlip`, `bouncy`, etc.).
- `__tests__/shared/animation/motionPresets.test.ts` — assert each preset uses `motion.duration.base` (or `quick` for `contentExit`) and `motion.easing.standard`. Assert `listItemEnter` delay cap: `listItemEnter(10).delayV` equals `listItemEnter(maxItems).delayV`.
- `__tests__/shared/animation/navigationPresets.test.ts` — assert `stackPushOptions`/`modalPushOptions` return `motion.duration.base`, `tabShiftOptions` returns `motion.duration.quick`.
- No new unit tests for `useScalePress`, `AnimatedFlipCard`, `SwipeStudyCard` — visual/gesture behavior, validated by manual QA.

### Manual QA checklist

- Bottom tab transitions across all 4 tabs share one rhythm.
- Home → deck detail → card list → card edit slides at one beat.
- Study screen modal entry matches 220ms.
- Home/decks/store list entries arrive nearly simultaneously (no visible cascade).
- Study card flip is smooth without scale wobble.
- Swipe cancel returns via spring; swipe exit feels consistent with screen transitions.
- All press feedback feels identical across cards, buttons, list rows.
- Toast enter/exit shares the language.

### Migration order

1. Replace tokens (`motionTokens.ts`).
2. Replace presets (`motionPresets.ts`).
3. Mechanical call-site replacement (Rule A).
4. Per-screen review for stagger and cascade (Rules C, D).
5. Press unification (Rule E).
6. Study card tuning (`AnimatedFlipCard`, `SwipeStudyCard`).
7. Update tests (`motionTokens`, `motionPresets`, `navigationPresets`).
8. Run `npm run typecheck && npm run lint && npm test`.
9. Manual QA against checklist.

## Risks

- **Native vs Reanimated alignment is approximate.** Native stack/tab animations are driven by the OS; matching duration aligns the *beat* but not the curve exactly. Acceptable — users sense the beat, not the curve math.
- **Cascade removal may flatten screens that depended on staged reveal for clarity.** Mitigated by Rule D's narrative-step exception and per-screen review.
- **Rotation factor change (`/20 → /28`) may feel under-responsive to existing users.** Tunable in QA; the value is a single token-level constant.
