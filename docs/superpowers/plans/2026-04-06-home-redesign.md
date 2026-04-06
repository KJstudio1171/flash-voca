# Home Screen & Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈화면을 피드 스타일로 전면 재작성하고, Panel에서 accent bar를 제거하여 앱 전체 시각 톤을 통일한다.

**Architecture:** Panel에서 accentColor prop과 왼쪽 5px border를 제거한다. DeckSummary 모델과 서비스 메서드를 추가하여 홈화면에서 각 덱의 due/mastered를 표시한다. react-native-svg 기반 CircularProgress와 DeckCard 컴포넌트를 새로 만들고, HomeScreen을 피드 스타일로 재작성한다.

**Tech Stack:** React Native, TypeScript, react-native-svg, TanStack Query, expo-sqlite

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/shared/ui/Panel.tsx` | accent bar 제거, accentColor prop 제거 |
| Modify | `src/features/study/screens/StudyScreen.tsx` | Panel accentColor 제거 |
| Modify | `src/features/store/screens/StoreScreen.tsx` | Panel accentColor 제거 |
| Modify | `src/features/store/screens/BundleDetailScreen.tsx` | Panel accentColor 제거 |
| Modify | `src/features/profile/screens/ProfileScreen.tsx` | Panel accentColor 제거 |
| Modify | `src/features/decks/screens/MyDecksScreen.tsx` | Panel accentColor 제거 |
| Modify | `src/features/decks/screens/DeckEditorScreen.tsx` | Panel accentColor 제거 |
| Modify | `src/core/domain/models.ts` | DeckSummary 인터페이스 추가 |
| Modify | `src/core/services/StudySessionService.ts` | listDeckSummariesAsync 추가 |
| Create | `src/shared/ui/CircularProgress.tsx` | 원형 프로그레스 컴포넌트 |
| Create | `src/features/home/components/DeckCard.tsx` | 덱 카드 피드 아이템 |
| Create | `src/features/home/hooks/useHomeSummaryQuery.ts` | 홈 전용 쿼리 훅 |
| Modify | `src/features/home/screens/HomeScreen.tsx` | 피드 스타일로 전면 재작성 |

---

### Task 1: react-native-svg 설치

**Files:** (none — dependency only)

- [ ] **Step 1: Install react-native-svg**

Run:
```bash
npx expo install react-native-svg
```

Expected: package.json에 `react-native-svg` 추가됨.

- [ ] **Step 2: Verify installation**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-native-svg dependency"
```

---

### Task 2: Panel 리디자인 + 전체 화면 accentColor 제거

**Files:**
- Modify: `src/shared/ui/Panel.tsx`
- Modify: `src/features/study/screens/StudyScreen.tsx`
- Modify: `src/features/store/screens/StoreScreen.tsx`
- Modify: `src/features/store/screens/BundleDetailScreen.tsx`
- Modify: `src/features/profile/screens/ProfileScreen.tsx`
- Modify: `src/features/decks/screens/MyDecksScreen.tsx`
- Modify: `src/features/decks/screens/DeckEditorScreen.tsx`

- [ ] **Step 1: Modify Panel component**

`src/shared/ui/Panel.tsx`를 다음으로 교체:

```tsx
import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type PanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Panel({ children, style }: PanelProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.l,
    borderWidth: 1,
    padding: tokens.spacing.l,
    gap: tokens.spacing.s,
  },
});
```

주요 변경:
- `accentColor` prop 제거
- `borderLeftWidth: 5` 제거
- `borderLeftColor` 로직 제거

- [ ] **Step 2: Remove accentColor from StudyScreen**

`src/features/study/screens/StudyScreen.tsx`에서 2곳 변경:

86행: `<Panel accentColor={colors.accent}>` → `<Panel>`
115행: `<Panel accentColor={colors.accent}>` → `<Panel>`

- [ ] **Step 3: Remove accentColor from StoreScreen**

`src/features/store/screens/StoreScreen.tsx`에서 2곳 변경:

23행: `<Panel accentColor={colors.accent}>` → `<Panel>`
32행: `<Panel key={bundle.id} accentColor={bundle.coverColor}>` → `<Panel key={bundle.id}>`

- [ ] **Step 4: Remove accentColor from BundleDetailScreen**

`src/features/store/screens/BundleDetailScreen.tsx`에서 1곳 변경:

38행: `<Panel accentColor={bundle.coverColor}>` → `<Panel>`

- [ ] **Step 5: Remove accentColor from ProfileScreen**

`src/features/profile/screens/ProfileScreen.tsx`에서 1곳 변경:

32행: `<Panel accentColor={hasSupabaseConfig ? colors.primary : colors.info}>` → `<Panel>`

- [ ] **Step 6: Remove accentColor from MyDecksScreen**

`src/features/decks/screens/MyDecksScreen.tsx`에서 1곳 변경:

37행: `<Panel key={deck.id} accentColor={deck.accentColor}>` → `<Panel key={deck.id}>`

- [ ] **Step 7: Remove accentColor from DeckEditorScreen**

`src/features/decks/screens/DeckEditorScreen.tsx`에서 2곳 변경:

146행: `<Panel accentColor={colors.primary}>` → `<Panel>`
203행: `<Panel accentColor={colors.info}>` → `<Panel>`

- [ ] **Step 8: Verify**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/shared/ui/Panel.tsx src/features/study/screens/StudyScreen.tsx src/features/store/screens/StoreScreen.tsx src/features/store/screens/BundleDetailScreen.tsx src/features/profile/screens/ProfileScreen.tsx src/features/decks/screens/MyDecksScreen.tsx src/features/decks/screens/DeckEditorScreen.tsx
git commit -m "refactor: remove accent bar from Panel, clean up all screens"
```

---

### Task 3: DeckSummary 모델 + 서비스 메서드

**Files:**
- Modify: `src/core/domain/models.ts`
- Modify: `src/core/services/StudySessionService.ts`

- [ ] **Step 1: Add DeckSummary interface**

`src/core/domain/models.ts`에서 `StudyDeckSnapshot` 인터페이스 바로 앞에 추가:

```typescript
export interface DeckSummary extends Deck {
  dueCount: number;
  masteredCount: number;
}
```

정확한 위치: `export interface StudyCard {` 앞에 삽입.

- [ ] **Step 2: Add listDeckSummariesAsync to StudySessionService**

`src/core/services/StudySessionService.ts`를 다음으로 교체:

```typescript
import { LOCAL_USER_ID } from "@/src/core/config/constants";
import { DeckSummary, LogReviewInput, StudyDeckSnapshot } from "@/src/core/domain/models";
import { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";

export class StudySessionService {
  constructor(
    private readonly deckRepository: DeckRepository,
    private readonly studyRepository: StudyRepository,
  ) {}

  async listDeckSummariesAsync(userId = LOCAL_USER_ID): Promise<DeckSummary[]> {
    const decks = await this.deckRepository.listDecksAsync();
    const summaries = await Promise.all(
      decks.map(async (deck) => {
        const states = await this.studyRepository.listCardStatesAsync(deck.id, userId);
        const now = Date.now();
        const notDueCount = states.filter(
          (s) => s.nextReviewAt && new Date(s.nextReviewAt).getTime() > now,
        ).length;
        const dueCount = deck.cardCount - notDueCount;
        const masteredCount = states.filter((s) => s.masteryLevel >= 3).length;
        return { ...deck, dueCount, masteredCount };
      }),
    );
    return summaries;
  }

  async getSnapshotAsync(deckId: string, userId = LOCAL_USER_ID) {
    const [deck, states] = await Promise.all([
      this.deckRepository.getDeckByIdAsync(deckId),
      this.studyRepository.listCardStatesAsync(deckId, userId),
    ]);

    if (!deck) {
      return null;
    }

    const stateByCardId = new Map(states.map((state) => [state.cardId, state]));
    const cards = deck.cards.map((card) => ({
      card,
      state: stateByCardId.get(card.id) ?? null,
    }));
    const dueCount = cards.filter((item) => {
      if (!item.state?.nextReviewAt) {
        return true;
      }

      return new Date(item.state.nextReviewAt).getTime() <= Date.now();
    }).length;
    const masteredCount = cards.filter((item) => (item.state?.masteryLevel ?? 0) >= 3)
      .length;

    return {
      deck,
      cards,
      dueCount,
      masteredCount,
    } satisfies StudyDeckSnapshot;
  }

  recordReviewAsync(input: LogReviewInput, userId = LOCAL_USER_ID) {
    return this.studyRepository.logReviewAsync(input, userId);
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/core/domain/models.ts src/core/services/StudySessionService.ts
git commit -m "feat: add DeckSummary model and listDeckSummariesAsync service method"
```

---

### Task 4: CircularProgress 컴포넌트

**Files:**
- Create: `src/shared/ui/CircularProgress.tsx`

- [ ] **Step 1: Create CircularProgress component**

`src/shared/ui/CircularProgress.tsx`:

```tsx
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/src/shared/theme/ThemeProvider";

type CircularProgressProps = {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
};

function CircularProgressComponent({
  size = 48,
  strokeWidth = 4,
  progress,
  color,
  trackColor,
}: CircularProgressProps) {
  const { colors } = useTheme();
  const effectiveColor = color ?? colors.primary;
  const effectiveTrackColor = trackColor ?? colors.line;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const percent = Math.round(clampedProgress * 100);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={effectiveTrackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          stroke={effectiveColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.label,
            { color: effectiveColor, fontSize: size * 0.23 },
          ]}
        >
          {percent}%
        </Text>
      </View>
    </View>
  );
}

export const CircularProgress = memo(CircularProgressComponent);

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/CircularProgress.tsx
git commit -m "feat: add CircularProgress component with react-native-svg"
```

---

### Task 5: DeckCard 컴포넌트

**Files:**
- Create: `src/features/home/components/DeckCard.tsx`

- [ ] **Step 1: Create DeckCard component**

먼저 디렉토리 확인:
```bash
ls src/features/home/
```
`components/` 디렉토리가 없으면 생성됨.

`src/features/home/components/DeckCard.tsx`:

```tsx
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";

type DeckCardProps = {
  title: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  onPress: () => void;
};

function DeckCardComponent({
  title,
  cardCount,
  dueCount,
  masteredCount,
  onPress,
}: DeckCardProps) {
  const { colors } = useTheme();
  const progress = cardCount > 0 ? masteredCount / cardCount : 0;
  const isDone = dueCount === 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        pressed && styles.pressed,
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
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
  },
  action: {
    borderRadius: tokens.radius.s,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/home/components/DeckCard.tsx
git commit -m "feat: add DeckCard component for home feed"
```

---

### Task 6: 홈 전용 쿼리 훅

**Files:**
- Create: `src/features/home/hooks/useHomeSummaryQuery.ts`

- [ ] **Step 1: Create useHomeSummaryQuery hook**

먼저 디렉토리 확인:
```bash
ls src/features/home/
```
`hooks/` 디렉토리가 없으면 생성됨.

`src/features/home/hooks/useHomeSummaryQuery.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export function useDeckSummaryListQuery() {
  const { studySessionService } = useAppServices();

  return useQuery({
    queryKey: ["deck-summaries"],
    queryFn: () => studySessionService.listDeckSummariesAsync(),
  });
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/home/hooks/useHomeSummaryQuery.ts
git commit -m "feat: add useDeckSummaryListQuery hook for home screen"
```

---

### Task 7: HomeScreen 피드 스타일 재작성

**Files:**
- Modify: `src/features/home/screens/HomeScreen.tsx`

- [ ] **Step 1: Rewrite HomeScreen**

`src/features/home/screens/HomeScreen.tsx`를 다음으로 교체:

```tsx
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { DeckCard } from "@/src/features/home/components/DeckCard";
import { useDeckSummaryListQuery } from "@/src/features/home/hooks/useHomeSummaryQuery";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";

function buildSubtitle(totalDue: number, hasDecks: boolean): string | undefined {
  if (!hasDecks) return undefined;
  if (totalDue === 0) return "모든 카드를 복습했어요";
  return `오늘 복습할 카드 ${totalDue}장`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const summaryQuery = useDeckSummaryListQuery();
  const decks = summaryQuery.data ?? [];
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return (
    <Screen title="Home" subtitle={buildSubtitle(totalDue, decks.length > 0)}>
      {decks.length === 0 && !summaryQuery.isLoading ? (
        <Panel>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            첫 단어장을 만들어보세요
          </Text>
          <AppButton
            onPress={() =>
              router.push({
                pathname: "/decks/[deckId]/edit",
                params: { deckId: "new" },
              })
            }
          >
            Create Deck
          </AppButton>
        </Panel>
      ) : null}

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
```

주요 변경:
- `useDeckListQuery` + `useBundleCatalogQuery` → `useDeckSummaryListQuery`
- 히어로 Panel, 통계 그리드, Next Focus Panel 모두 제거
- 덱 피드: `DeckCard` 컴포넌트로 나열
- 빈 상태: Panel + "첫 단어장을 만들어보세요" + Create Deck 버튼
- subtitle: 전체 due 합산 표시
- 사용하지 않는 import 제거 (`View`, `Badge`, `tokens`, `useDeckListQuery`, `useBundleCatalogQuery` 등)

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/home/screens/HomeScreen.tsx
git commit -m "feat: rewrite HomeScreen as deck feed with circular progress"
```

---

### Task 8: 최종 검증

**Files:** (none — verification only)

- [ ] **Step 1: Verify typecheck and lint**

Run: `npm run typecheck`
Run: `npm run lint`

Expected: both pass with zero errors.

- [ ] **Step 2: Verify Panel has no accentColor**

Run: `grep -rn "accentColor" src/`
Expected: ZERO results.

- [ ] **Step 3: Verify no leftover Panel border styles**

Run: `grep -n "borderLeftWidth\|borderLeftColor" src/shared/ui/Panel.tsx`
Expected: ZERO results.

- [ ] **Step 4: Verify HomeScreen uses DeckCard**

Run: `grep -n "DeckCard" src/features/home/screens/HomeScreen.tsx`
Expected: import + usage lines found.
