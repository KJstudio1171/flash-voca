# Card & Background Design Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플래시카드에 soft shadow 깊이감과 타이포 위계를 부여하고, Screen 배경의 orb 장식을 제거한다.

**Architecture:** ColorScheme에 3개 토큰(`primarySoftStrong`, `cardShadowFront`, `cardShadowBack`)을 추가하고, StudyFlashcard에서 border를 shadow로 교체한다. Screen에서 orb View 2개를 제거한다. 카드 높이를 화면 비율 기반으로 조정한다.

**Tech Stack:** React Native, TypeScript, react-native-reanimated

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/shared/theme/palettes/types.ts` | 3개 토큰 추가 |
| Modify | `src/shared/theme/palettes/cool-modern.ts` | 3개 값 추가 |
| Modify | `src/shared/theme/palettes/warm-refresh.ts` | 3개 값 추가 |
| Modify | `src/shared/theme/palettes/nature-fresh.ts` | 3개 값 추가 |
| Modify | `src/shared/theme/palettes/neutral-clean.ts` | 3개 값 추가 |
| Modify | `src/shared/ui/Screen.tsx` | orb 제거 |
| Modify | `src/features/study/components/StudyFlashcard.tsx` | shadow, 타이포, 높이 |

---

### Task 1: ColorScheme 토큰 추가

**Files:**
- Modify: `src/shared/theme/palettes/types.ts`
- Modify: `src/shared/theme/palettes/cool-modern.ts`
- Modify: `src/shared/theme/palettes/warm-refresh.ts`
- Modify: `src/shared/theme/palettes/nature-fresh.ts`
- Modify: `src/shared/theme/palettes/neutral-clean.ts`

- [ ] **Step 1: Add 3 tokens to ColorScheme type**

`src/shared/theme/palettes/types.ts`에서 `chipEasyBorder: string;` 뒤에 추가:

```typescript
  primarySoftStrong: string;
  cardShadowFront: string;
  cardShadowBack: string;
```

전체 파일:

```typescript
export type PaletteId = "cool-modern" | "warm-refresh" | "nature-fresh" | "neutral-clean";

export type ColorScheme = {
  canvas: string;
  surface: string;
  surfaceStrong: string;
  ink: string;
  muted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  info: string;
  infoSoft: string;
  line: string;
  onPrimary: string;
  overlayWhite: string;
  primaryGlow: string;
  accentGlow: string;
  neutralGlow: string;
  chipAgainBg: string;
  chipAgainBorder: string;
  chipEasyBg: string;
  chipEasyBorder: string;
  primarySoftStrong: string;
  cardShadowFront: string;
  cardShadowBack: string;
};
```

- [ ] **Step 2: Add values to cool-modern.ts**

`src/shared/theme/palettes/cool-modern.ts`에서 `chipEasyBorder` 뒤에 추가:

```typescript
  primarySoftStrong: "#E0E7FF",
  cardShadowFront: "#6366F1",
  cardShadowBack: "#F43F5E",
```

- [ ] **Step 3: Add values to warm-refresh.ts**

`src/shared/theme/palettes/warm-refresh.ts`에서 `chipEasyBorder` 뒤에 추가:

```typescript
  primarySoftStrong: "#FDE68A",
  cardShadowFront: "#D97706",
  cardShadowBack: "#DC2626",
```

- [ ] **Step 4: Add values to nature-fresh.ts**

`src/shared/theme/palettes/nature-fresh.ts`에서 `chipEasyBorder` 뒤에 추가:

```typescript
  primarySoftStrong: "#BBF7D0",
  cardShadowFront: "#16A34A",
  cardShadowBack: "#F97316",
```

- [ ] **Step 5: Add values to neutral-clean.ts**

`src/shared/theme/palettes/neutral-clean.ts`에서 `chipEasyBorder` 뒤에 추가:

```typescript
  primarySoftStrong: "#BFDBFE",
  cardShadowFront: "#2563EB",
  cardShadowBack: "#F59E0B",
```

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck`
Expected: PASS (no errors)

```bash
git add src/shared/theme/palettes/
git commit -m "feat: add card shadow and badge tokens to color scheme"
```

---

### Task 2: Screen 배경 orb 제거

**Files:**
- Modify: `src/shared/ui/Screen.tsx`

- [ ] **Step 1: Remove orb Views and styles**

`src/shared/ui/Screen.tsx`를 다음으로 교체한다:

```tsx
import { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scroll?: boolean;
  rightSlot?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  title,
  subtitle,
  scroll = true,
  rightSlot,
  contentStyle,
  children,
}: ScreenProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.content, contentStyle]}>
      <AnimatedScreen style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </AnimatedScreen>
      <AnimatedScreen delay={80} style={styles.body}>
        {children}
      </AnimatedScreen>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.l,
    paddingTop: tokens.spacing.s,
    gap: tokens.spacing.l,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing.s,
  },
  headerCopy: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    gap: tokens.spacing.l,
  },
});
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/shared/ui/Screen.tsx
git commit -m "refactor: remove background orbs from Screen"
```

---

### Task 3: StudyFlashcard 디자인 개선

**Files:**
- Modify: `src/features/study/components/StudyFlashcard.tsx`

- [ ] **Step 1: Replace StudyFlashcard with new design**

`src/features/study/components/StudyFlashcard.tsx`를 다음으로 교체한다:

```tsx
import { memo, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";

import { StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const CARD_HEIGHT = Math.min(400, Math.max(240, SCREEN_HEIGHT * 0.42));

type StudyFlashcardProps = {
  card: StudyCard;
  disabled?: boolean;
  onRate: (rating: 1 | 2 | 3) => void;
};

function StudyFlashcardComponent({
  card,
  disabled = false,
  onRate,
}: StudyFlashcardProps) {
  const { colors } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const masteryLabel =
    card.state == null ? "New" : `Mastery ${card.state.masteryLevel}`;

  const frontShadow = Platform.select({
    ios: {
      shadowColor: colors.cardShadowFront,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  });

  const backShadow = Platform.select({
    ios: {
      shadowColor: colors.cardShadowBack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  });

  return (
    <View style={styles.root}>
      <SwipeStudyCard
        disabled={disabled}
        leftActionLabel="Again"
        upActionLabel="Good"
        rightActionLabel="Easy"
        onSwipeComplete={(direction) => {
          const ratingMap = { left: 1, up: 2, right: 3 } as const;
          onRate(ratingMap[direction]);
        }}
      >
        <AnimatedFlipCard
          back={
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface },
                backShadow,
              ]}
            >
              <View style={styles.cardCenter}>
                <Text style={[styles.label, { color: colors.accent }]}>MEANING</Text>
                <Text style={[styles.meaningText, { color: colors.ink }]}>{card.card.meaning}</Text>
              </View>
            </View>
          }
          flipped={flipped}
          onPress={() => {
            if (!disabled) {
              setFlipped((current) => !current);
            }
          }}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface },
              frontShadow,
            ]}
          >
            <View style={[styles.masteryBadge, { backgroundColor: colors.primarySoftStrong }]}>
              <Text style={[styles.masteryText, { color: colors.primary }]}>{masteryLabel}</Text>
            </View>
            <View style={styles.cardCenter}>
              <Text style={[styles.label, { color: colors.primary }]}>TERM</Text>
              <Text style={[styles.termText, { color: colors.ink }]}>{card.card.term}</Text>
              <Text style={[styles.hint, { color: colors.muted }]}>tap to flip</Text>
            </View>
          </View>
        </AnimatedFlipCard>
      </SwipeStudyCard>

      <Text style={[styles.swipeHint, { color: colors.muted }]}>← Again   ↑ Good   Easy →</Text>
    </View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.xs,
  },
  card: {
    minHeight: CARD_HEIGHT,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  masteryBadge: {
    position: "absolute",
    top: tokens.spacing.m,
    left: tokens.spacing.m,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  masteryText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardCenter: {
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  termText: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  meaningText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
  },
  swipeHint: {
    textAlign: "center",
    fontSize: 11,
  },
});
```

주요 변경 사항:
- `Dimensions`, `Platform` import 추가
- `CARD_HEIGHT` = `clamp(240, height * 0.42, 400)`
- `cardFront`, `cardBack` 스타일 제거 (border 없음)
- `frontShadow`, `backShadow` — iOS `shadowColor`/Android `elevation` 분기
- mastery 배지: `primarySoft` → `primarySoftStrong`
- 타이포: label fontSize 11→10, letterSpacing 1.5→2, fontWeight 700→600
- termText fontSize 36→34, letterSpacing -0.5 추가
- meaningText fontSize 34→32, letterSpacing -0.3 추가
- hint fontSize 14→12
- swipeHint fontSize 12→11

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run lint`
Expected: PASS

```bash
git add src/features/study/components/StudyFlashcard.tsx
git commit -m "feat: redesign flashcard with soft shadow and improved typography"
```

---

### Task 4: 최종 검증

**Files:** (none — verification only)

- [ ] **Step 1: Verify typecheck and lint**

Run: `npm run typecheck`
Run: `npm run lint`

Expected: both pass with zero errors.

- [ ] **Step 2: Verify orb removal**

Run: `grep -n "backgroundOrb" src/shared/ui/Screen.tsx`
Expected: ZERO results.

- [ ] **Step 3: Verify no border on flashcard**

Run: `grep -n "borderWidth\|borderColor" src/features/study/components/StudyFlashcard.tsx`
Expected: ZERO results.
