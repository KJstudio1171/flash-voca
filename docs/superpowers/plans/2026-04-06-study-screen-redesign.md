# Study Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 화면을 scaffold에서 게이미피케이션 제품 UI로 전환한다 — 3방향 스와이프, 진행 바, 축하 완료 화면.

**Architecture:** `SwipeStudyCard`에 Y축을 추가하고, `StudyFlashcard`를 단순화하고, `StudyScreen`에서 Rating Panel/버튼을 제거한 뒤 새 `StudyHeader`와 `SessionCompleteCard`로 교체한다. `useStudySession` 훅에 rating 분포 추적을 추가한다.

**Tech Stack:** React Native, react-native-reanimated, react-native-gesture-handler, TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/shared/animation/SwipeStudyCard.tsx` | 3방향 스와이프 (Y축 추가) |
| Modify | `src/features/study/hooks/useStudySession.ts` | rating 분포 추적 추가 |
| Create | `src/features/study/components/StudyHeader.tsx` | 진행 바 + 스트릭 + 카운터 |
| Modify | `src/features/study/components/StudyFlashcard.tsx` | 카드 앞/뒷면 레이아웃 단순화 |
| Create | `src/features/study/components/SessionCompleteCard.tsx` | 축하 + 통계 완료 화면 |
| Modify | `src/features/study/screens/StudyScreen.tsx` | 새 컴포넌트 조립, Rating Panel 제거 |
| Delete | `src/features/study/components/StudyRatingBar.tsx` | 버튼 평가 UI 제거 |

---

### Task 1: SwipeStudyCard — 3방향 스와이프

**Files:**
- Modify: `src/shared/animation/SwipeStudyCard.tsx`

- [ ] **Step 1: Add translateY shared value and update type**

`SwipeStudyCard.tsx` 상단의 타입과 shared value를 수정한다.

```tsx
type SwipeDirection = "left" | "right" | "up";
```

함수 본문에서 `translateY` shared value를 추가한다:

```tsx
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
```

- [ ] **Step 2: Replace Pan gesture with 3-direction logic**

기존 `gesture` 정의를 다음으로 교체한다. 핵심 변경: `failOffsetY` 제거, `activeOffsetY` 추가, `onUpdate`에서 Y축 추적, `onEnd`에서 방향 판정.

```tsx
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
```

- [ ] **Step 3: Update animated styles for Y axis**

기존 `animatedStyle`을 교체한다:

```tsx
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
```

`glowStyle`을 3방향으로 업데이트한다:

```tsx
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
```

- [ ] **Step 4: Add upActionLabel prop and up chip**

props에 `upActionLabel`을 추가한다:

```tsx
type SwipeStudyCardProps = PropsWithChildren<{
  disabled?: boolean;
  leftActionLabel?: string;
  rightActionLabel?: string;
  upActionLabel?: string;
  onSwipeComplete?: (direction: SwipeDirection) => void;
}>;
```

함수 파라미터 destructuring에 `upActionLabel`을 추가한다.

`upLabelStyle` animated style을 추가한다:

```tsx
const upLabelStyle = useAnimatedStyle(() => ({
  opacity: interpolate(-translateY.value, [24, SWIPE_THRESHOLD], [0, 1]),
  transform: [{ scale: interpolate(-translateY.value, [24, SWIPE_THRESHOLD], [0.96, 1]) }],
}));
```

JSX에서 right chip 뒤에 up chip을 추가한다:

```tsx
{upActionLabel ? (
  <Animated.View
    pointerEvents="none"
    style={[styles.actionChip, styles.upChip, upLabelStyle]}
  >
    <Text style={[styles.actionLabel, styles.upLabel]}>{upActionLabel}</Text>
  </Animated.View>
) : null}
```

styles에 `upChip`과 `upLabel`을 추가한다:

```tsx
upChip: {
  top: tokens.spacing.m,
  left: "50%",
  transform: [{ translateX: -24 }],
  backgroundColor: tokens.colors.surface,
  borderColor: tokens.colors.line,
},
upLabel: {
  color: tokens.colors.ink,
},
```

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck`
Expected: no errors

```bash
git add src/shared/animation/SwipeStudyCard.tsx
git commit -m "feat: add 3-direction swipe (left/up/right) to SwipeStudyCard"
```

---

### Task 2: useStudySession — rating 분포 추적

**Files:**
- Modify: `src/features/study/hooks/useStudySession.ts`

- [ ] **Step 1: Add rating distribution state**

`useStudySession` 함수 본문에서, 기존 `useState` 선언들 아래에 추가한다:

```tsx
const [ratingCounts, setRatingCounts] = useState({ again: 0, good: 0, easy: 0 });
```

- [ ] **Step 2: Track ratings in rateCard**

`rateCard` 콜백 내부에서, `recordReview` 호출 직전에 rating 분포를 업데이트한다:

```tsx
setRatingCounts((prev) => ({
  ...prev,
  ...(rating === 1 && { again: prev.again + 1 }),
  ...(rating === 2 && { good: prev.good + 1 }),
  ...(rating === 3 && { easy: prev.easy + 1 }),
}));
```

- [ ] **Step 3: Reset counts in restartSession**

`restartSession` 콜백 내부에 추가한다:

```tsx
setRatingCounts({ again: 0, good: 0, easy: 0 });
```

- [ ] **Step 4: Expose ratingCounts in return value**

return 객체에 `ratingCounts`를 추가한다:

```tsx
return {
  completed,
  currentCard,
  currentIndex,
  isTransitioning,
  lastError,
  rateCard,
  ratingCounts,
  restartSession,
  totalCards: cards.length,
};
```

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck`
Expected: no errors

```bash
git add src/features/study/hooks/useStudySession.ts
git commit -m "feat: track rating distribution in useStudySession"
```

---

### Task 3: StudyHeader — 진행 바 + 스트릭 + 카운터

**Files:**
- Create: `src/features/study/components/StudyHeader.tsx`

- [ ] **Step 1: Create StudyHeader component**

```tsx
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { tokens } from "@/src/shared/theme/tokens";

type StudyHeaderProps = {
  deckTitle: string;
  currentIndex: number;
  totalCards: number;
  dueCount: number;
  masteredCount: number;
};

function StudyHeaderComponent({
  deckTitle,
  currentIndex,
  totalCards,
  dueCount,
  masteredCount,
}: StudyHeaderProps) {
  const progress = totalCards > 0 ? currentIndex / totalCards : 0;

  const progressStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress * 100}%` as unknown as number, { duration: 300 }),
  }));

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {deckTitle}
        </Text>
        <Text style={styles.streak}>🔥</Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <View style={styles.countersRow}>
        <Text style={styles.counter}>{currentIndex} / {totalCards}</Text>
        <View style={styles.countersRight}>
          <Text style={[styles.counterLabel, { color: tokens.colors.accent }]}>
            {dueCount} due
          </Text>
          <Text style={[styles.counterLabel, { color: tokens.colors.primary }]}>
            {masteredCount} mastered
          </Text>
        </View>
      </View>
    </View>
  );
}

export const StudyHeader = memo(StudyHeaderComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  streak: {
    fontSize: 13,
    fontWeight: "700",
    color: tokens.colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: tokens.colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: tokens.colors.primary,
  },
  countersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.muted,
  },
  countersRight: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: no errors

```bash
git add src/features/study/components/StudyHeader.tsx
git commit -m "feat: add StudyHeader with progress bar and counters"
```

---

### Task 4: StudyFlashcard — 카드 레이아웃 단순화

**Files:**
- Modify: `src/features/study/components/StudyFlashcard.tsx`

- [ ] **Step 1: Replace entire StudyFlashcard.tsx**

파일 전체를 다음으로 교체한다:

```tsx
import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { tokens } from "@/src/shared/theme/tokens";

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
  const [flipped, setFlipped] = useState(false);
  const masteryLabel =
    card.state == null ? "New" : `Mastery ${card.state.masteryLevel}`;

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
            <View style={[styles.card, styles.cardBack]}>
              <View style={styles.cardCenter}>
                <Text style={styles.label}>MEANING</Text>
                <Text style={styles.meaningText}>{card.card.meaning}</Text>
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
          <View style={[styles.card, styles.cardFront]}>
            <View style={styles.masteryBadge}>
              <Text style={styles.masteryText}>{masteryLabel}</Text>
            </View>
            <View style={styles.cardCenter}>
              <Text style={styles.label}>TERM</Text>
              <Text style={styles.termText}>{card.card.term}</Text>
              <Text style={styles.hint}>tap to flip</Text>
            </View>
          </View>
        </AnimatedFlipCard>
      </SwipeStudyCard>

      <Text style={styles.swipeHint}>← Again   ↑ Good   Easy →</Text>
    </View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.xs,
  },
  card: {
    minHeight: 240,
    borderRadius: tokens.radius.l,
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  cardFront: {
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  cardBack: {
    borderWidth: 2,
    borderColor: tokens.colors.accent,
  },
  masteryBadge: {
    position: "absolute",
    top: tokens.spacing.m,
    left: tokens.spacing.m,
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  masteryText: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.colors.primary,
  },
  cardCenter: {
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: tokens.colors.primary,
  },
  termText: {
    fontSize: 36,
    fontWeight: "800",
    color: tokens.colors.ink,
    textAlign: "center",
  },
  meaningText: {
    fontSize: 34,
    fontWeight: "800",
    color: tokens.colors.ink,
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    color: tokens.colors.muted,
  },
  swipeHint: {
    textAlign: "center",
    fontSize: 12,
    color: tokens.colors.muted,
  },
});
```

주의: `label` 스타일의 `color`는 앞면에서 `primary`, 뒷면에서 `accent`여야 한다. 뒷면의 "MEANING" 라벨에 인라인 스타일을 적용한다:

Back의 `<Text style={styles.label}>MEANING</Text>` 을 다음으로 변경:

```tsx
<Text style={[styles.label, { color: tokens.colors.accent }]}>MEANING</Text>
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: no errors

```bash
git add src/features/study/components/StudyFlashcard.tsx
git commit -m "feat: simplify StudyFlashcard layout with clean card design"
```

---

### Task 5: SessionCompleteCard — 축하 + 통계 완료 화면

**Files:**
- Create: `src/features/study/components/SessionCompleteCard.tsx`

- [ ] **Step 1: Create SessionCompleteCard component**

```tsx
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/shared/ui/AppButton";
import { tokens } from "@/src/shared/theme/tokens";

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

function SessionCompleteCardComponent({
  totalCards,
  masteredCount,
  ratingCounts,
  onRestart,
}: SessionCompleteCardProps) {
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <View style={styles.root}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.title}>세션 완료!</Text>
      <Text style={styles.subtitle}>🔥 {totalCards}장 완료</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: tokens.colors.accentSoft }]}>
          <Text style={[styles.statValue, { color: tokens.colors.accent }]}>
            {ratingCounts.again}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.colors.accent }]}>AGAIN</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tokens.colors.surface }]}>
          <Text style={[styles.statValue, { color: tokens.colors.ink }]}>
            {ratingCounts.good}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.colors.muted }]}>GOOD</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tokens.colors.primarySoft }]}>
          <Text style={[styles.statValue, { color: tokens.colors.primary }]}>
            {ratingCounts.easy}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.colors.primary }]}>EASY</Text>
        </View>
      </View>

      <View style={styles.masteryBar}>
        <View style={styles.masteryHeader}>
          <Text style={styles.masteryLabel}>MASTERY</Text>
          <Text style={styles.masteryPercent}>{masteryPercent}%</Text>
        </View>
        <View style={styles.masteryTrack}>
          <View style={[styles.masteryFill, { width: `${masteryPercent}%` }]} />
        </View>
      </View>

      <AppButton onPress={onRestart} style={styles.restartButton}>
        다시 학습하기
      </AppButton>
    </View>
  );
}

export const SessionCompleteCard = memo(SessionCompleteCardComponent);

const styles = StyleSheet.create({
  root: {
    borderRadius: tokens.radius.l,
    backgroundColor: tokens.colors.primarySoft,
    padding: tokens.spacing.xl,
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  trophy: {
    fontSize: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: tokens.colors.primary,
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
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  masteryBar: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: tokens.radius.s,
    padding: tokens.spacing.s,
    gap: tokens.spacing.xs,
  },
  masteryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  masteryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.colors.muted,
    letterSpacing: 0.5,
  },
  masteryPercent: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.colors.primary,
  },
  masteryTrack: {
    height: 6,
    backgroundColor: tokens.colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  masteryFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: tokens.colors.primary,
  },
  restartButton: {
    borderRadius: tokens.radius.pill,
    marginTop: tokens.spacing.xs,
  },
});
```

주의: 스펙에서 그라데이션 배경(primarySoft → surface)을 사용하기로 했으나, `react-native-linear-gradient`는 현재 의존성에 없다. 그라데이션 대신 `primarySoft` 단색 배경을 사용한다. 이것으로 충분히 축하 느낌을 전달한다. import에서 `LinearGradient`를 제거한다.

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: no errors

```bash
git add src/features/study/components/SessionCompleteCard.tsx
git commit -m "feat: add SessionCompleteCard with stats and mastery bar"
```

---

### Task 6: StudyScreen — 조립 및 정리

**Files:**
- Modify: `src/features/study/screens/StudyScreen.tsx`
- Delete: `src/features/study/components/StudyRatingBar.tsx`

- [ ] **Step 1: Replace entire StudyScreen.tsx**

파일 전체를 다음으로 교체한다:

```tsx
import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text } from "react-native";

import { LogReviewInput } from "@/src/core/domain/models";
import { SessionCompleteCard } from "@/src/features/study/components/SessionCompleteCard";
import { StudyFlashcard } from "@/src/features/study/components/StudyFlashcard";
import { StudyHeader } from "@/src/features/study/components/StudyHeader";
import {
  useRecordReviewMutation,
  useStudyDeckQuery,
} from "@/src/features/study/hooks/useStudyQueries";
import { useStudySession } from "@/src/features/study/hooks/useStudySession";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function StudyScreen() {
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const studyQuery = useStudyDeckQuery(deckId);
  const reviewMutation = useRecordReviewMutation(deckId);
  const snapshot = studyQuery.data;
  const cards = snapshot?.cards ?? [];

  const recordReview = useCallback(
    ({
      input,
      onError,
    }: {
      input: LogReviewInput;
      onError?: (error: Error) => void;
    }) => {
      reviewMutation.mutate(input, {
        onError: (error) => {
          const normalizedError =
            error instanceof Error ? error : new Error("Failed to save study result.");
          onError?.(normalizedError);
        },
      });
    },
    [reviewMutation],
  );

  const session = useStudySession({
    deckId,
    cards,
    recordReview,
  });

  const currentCard = session.currentCard;
  const hasSnapshot = snapshot != null;
  const showEmptyState = !studyQuery.isLoading && hasSnapshot && cards.length === 0;

  return (
    <Screen
      contentStyle={styles.content}
      scroll={false}
      title={snapshot?.deck.title ?? "Study"}
    >
      {hasSnapshot ? (
        <StudyHeader
          deckTitle={snapshot.deck.title}
          currentIndex={session.currentIndex}
          totalCards={session.totalCards}
          dueCount={snapshot.dueCount}
          masteredCount={snapshot.masteredCount}
        />
      ) : null}

      {studyQuery.isLoading && !hasSnapshot ? (
        <Panel>
          <Badge tone="info">Loading</Badge>
          <Text style={styles.body}>학습 세션을 준비하고 있습니다.</Text>
        </Panel>
      ) : null}

      {studyQuery.isError ? (
        <Panel accentColor={tokens.colors.accent}>
          <Badge tone="accent">Error</Badge>
          <Text style={styles.body}>
            {studyQuery.error instanceof Error
              ? studyQuery.error.message
              : "학습 데이터를 불러올 수 없습니다."}
          </Text>
        </Panel>
      ) : null}

      {showEmptyState ? (
        <Panel>
          <Badge tone="info">Empty</Badge>
          <Text style={styles.body}>
            카드가 없습니다. 먼저 카드를 추가한 후 다시 시도하세요.
          </Text>
        </Panel>
      ) : null}

      {currentCard ? (
        <StudyFlashcard
          key={currentCard.card.id}
          card={currentCard}
          disabled={session.isTransitioning}
          onRate={session.rateCard}
        />
      ) : null}

      {session.lastError ? (
        <Panel accentColor={tokens.colors.accent}>
          <Badge tone="accent">저장 오류</Badge>
          <Text style={styles.body}>{session.lastError}</Text>
        </Panel>
      ) : null}

      {session.completed ? (
        <SessionCompleteCard
          totalCards={session.totalCards}
          masteredCount={snapshot?.masteredCount ?? 0}
          ratingCounts={session.ratingCounts}
          onRestart={session.restartSession}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.spacing.l,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.colors.muted,
  },
});
```

- [ ] **Step 2: Delete StudyRatingBar**

```bash
rm src/features/study/components/StudyRatingBar.tsx
```

- [ ] **Step 3: Verify no stale imports reference StudyRatingBar**

Run: `npm run typecheck`
Expected: no errors. `StudyRatingBar`를 import하는 곳이 없어야 한다.

- [ ] **Step 4: Commit**

```bash
git add src/features/study/screens/StudyScreen.tsx
git rm src/features/study/components/StudyRatingBar.tsx
git commit -m "feat: assemble redesigned study screen, remove rating buttons"
```

---

### Task 7: Final typecheck and lint

**Files:** (none — verification only)

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors (or only pre-existing warnings unrelated to changed files)

- [ ] **Step 3: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "chore: fix lint issues from study screen redesign"
```

Only run this step if lint reported fixable issues in changed files.
