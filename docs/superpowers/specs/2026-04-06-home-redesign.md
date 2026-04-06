# Home Screen & Panel Redesign — Design Spec

## Goal

홈화면을 피드 스타일로 전면 재작성하고, Panel 컴포넌트에서 왼쪽 accent bar를 제거하여 앱 전체의 시각적 톤을 통일한다.

## Design Decisions

| 항목 | 결정 |
|------|------|
| 홈 레이아웃 | 피드 스타일 — 덱 카드가 세로로 나열 |
| 요약 헤더 | 없음 — 헤더 subtitle에 전체 due 합산만 표시 |
| 덱 카드 스타일 | 얇은 1px border (shadow 없음) — 플래시카드(shadow)와 차별화 |
| 프로그레스 표시 | 원형 프로그레스 (react-native-svg) |
| 빈 상태 | CTA 카드 하나 — "첫 단어장을 만들어보세요" + Create Deck 버튼 |
| Panel 리디자인 | accent bar 제거, 균일한 1px border |
| 데이터 | 새 DeckSummary 모델 + listDeckSummariesAsync 서비스 메서드 |

## 1. Panel 컴포넌트 리디자인

### 변경 사항

**현재:**
```typescript
base: {
  borderRadius: tokens.radius.l,
  borderWidth: 1,
  borderLeftWidth: 5,  // accent bar
  padding: tokens.spacing.l,
  gap: tokens.spacing.s,
}
// + borderLeftColor: accentColor ?? "transparent"
```

**변경:**
```typescript
base: {
  borderRadius: tokens.radius.l,
  borderWidth: 1,
  padding: tokens.spacing.l,
  gap: tokens.spacing.s,
}
// borderColor: colors.line (단일 색상)
```

- `accentColor` prop 제거
- `borderLeftWidth: 5` 제거
- `borderLeftColor` 로직 제거

### 영향받는 화면

`accentColor` prop을 사용하는 모든 곳에서 해당 prop을 제거:

| 화면 | accentColor 사용 횟수 |
|------|----------------------|
| HomeScreen | 1 (전면 재작성 예정) |
| StudyScreen | 2 (`colors.accent`) |
| StoreScreen | 2 (`colors.accent`, `bundle.coverColor`) |
| BundleDetailScreen | 1 (`bundle.coverColor`) |
| ProfileScreen | 1 (`colors.primary` or `colors.info`) |
| MyDecksScreen | 1 (`deck.accentColor`) |
| DeckEditorScreen | 2 (`colors.primary`, `colors.info`) |

`accentColor` 없이 `<Panel>`만 사용하는 곳은 변경 불필요.

## 2. HomeScreen 리디자인

### 현재 구조 (제거)

- Screen 헤더: "Home" + 개발자용 subtitle
- 히어로 Panel: Today 뱃지 + 덱 제목 + 설명 + Start Study / View Decks 버튼
- 통계 그리드: 덱 수 / 번들 수 (2열)
- Next Focus Panel: 개발자용 텍스트 ("MVP routes already wired")

### 새 구조

```
Screen (title="Home", subtitle="오늘 복습할 카드 {totalDue}장")
  ├─ [덱이 있을 때] DeckCard × N (세로 나열)
  └─ [덱이 없을 때] EmptyState Panel ("첫 단어장을 만들어보세요" + Create Deck 버튼)
```

### Screen 헤더

- title: `"Home"`
- subtitle: `"오늘 복습할 카드 {totalDue}장"` — 전체 덱의 due 합산
- due가 0이면: `"모든 카드를 복습했어요"` (빈칸이 아닌 완료 메시지)
- 덱이 0개면: subtitle 없음

### 빈 상태 (덱 0개)

Panel 안에:
- 텍스트: "첫 단어장을 만들어보세요"
- AppButton: "Create Deck" → `/decks/[deckId]/edit` (deckId="new")

## 3. DeckCard 컴포넌트

### 위치

`src/features/home/components/DeckCard.tsx`

### 레이아웃

```
┌─────────────────────────────────────────────┐
│  ○ 73%  │  TOEIC 필수 단어 800    │ [Study] │
│  (svg)  │  48장 · 12장 due        │         │
└─────────────────────────────────────────────┘
```

- 왼쪽: CircularProgress (48×48, mastered 비율)
- 중앙: 덱 제목 (15px, weight 700) + 서브텍스트 (12px, muted) "N장 · N장 due"
- 오른쪽: AppButton variant="primary" 축소 버전, 또는 Pressable "Study" 텍스트 버튼
- 전체 카드를 Pressable로 감싸서 탭하면 학습 화면으로 이동
- due가 0이면 Study 버튼 대신 muted 색상의 "Done" 텍스트

### 스타일

Panel 기반이 아닌 독립 스타일:
- `backgroundColor: colors.surface`
- `borderWidth: 1`, `borderColor: colors.line`
- `borderRadius: tokens.radius.l`
- `padding: tokens.spacing.m`
- shadow 없음 (플래시카드와 차별화)

### Props

```typescript
type DeckCardProps = {
  title: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  onStudy: () => void;
};
```

## 4. CircularProgress 컴포넌트

### 위치

`src/shared/ui/CircularProgress.tsx`

### 의존성

`react-native-svg` 패키지 추가 필요. `expo install react-native-svg`로 설치.

### Props

```typescript
type CircularProgressProps = {
  size?: number;        // default 48
  strokeWidth?: number; // default 4
  progress: number;     // 0~1
  color?: string;       // default colors.primary
  trackColor?: string;  // default colors.line
};
```

### 구현 방식

- `react-native-svg`의 `Svg`, `Circle` 사용
- 배경 트랙: `trackColor`, full circle
- 진행 호: `color`, `strokeDasharray` + `strokeDashoffset`로 비율 표현
- 중앙 텍스트: `{Math.round(progress * 100)}%` (View 위에 absolute 배치)

## 5. 데이터 레이어

### 새 모델

`src/core/domain/models.ts`에 추가:

```typescript
export interface DeckSummary extends Deck {
  dueCount: number;
  masteredCount: number;
}
```

### 새 서비스 메서드

`StudySessionService`에 추가:

```typescript
async listDeckSummariesAsync(userId = LOCAL_USER_ID): Promise<DeckSummary[]> {
  const decks = await this.deckRepository.listDecksAsync();
  const summaries = await Promise.all(
    decks.map(async (deck) => {
      const states = await this.studyRepository.listCardStatesAsync(deck.id, userId);
      const stateByCardId = new Map(states.map((s) => [s.cardId, s]));
      const now = Date.now();
      // due = state가 없는 카드(new) + nextReviewAt이 없거나 현재 이전인 카드
      let dueCount = 0;
      for (let i = 0; i < deck.cardCount; i++) {
        // cardCount 기반으로 state 없는 카드(new)도 due로 카운트
      }
      // 실제 구현: state가 있는 카드 중 not-due인 것을 빼서 계산
      const notDueCount = states.filter((s) =>
        s.nextReviewAt && new Date(s.nextReviewAt).getTime() > now
      ).length;
      dueCount = deck.cardCount - notDueCount;
      const masteredCount = states.filter((s) => s.masteryLevel >= 3).length;
      return { ...deck, dueCount, masteredCount };
    })
  );
  return summaries;
}
```

due 카드 판정 로직은 기존 `getSnapshotAsync`와 동일: state가 없는 카드(new)는 항상 due, state가 있고 `nextReviewAt`이 없거나 현재 시각 이전이면 due. `deck.cardCount - notDueCount`로 계산하면 new 카드도 자동으로 due에 포함된다.

### 새 쿼리 훅

`src/features/home/hooks/useHomeSummaryQuery.ts`:

```typescript
export function useDeckSummaryListQuery() {
  const { studySessionService } = useAppServices();
  return useQuery({
    queryKey: ["deck-summaries"],
    queryFn: () => studySessionService.listDeckSummariesAsync(),
  });
}
```

## Files Changed

### 신규
- `src/shared/ui/CircularProgress.tsx` — 원형 프로그레스 컴포넌트
- `src/features/home/components/DeckCard.tsx` — 덱 카드 피드 아이템
- `src/features/home/hooks/useHomeSummaryQuery.ts` — 홈 전용 쿼리 훅

### 수정
- `src/shared/ui/Panel.tsx` — accent bar 제거, accentColor prop 제거
- `src/core/domain/models.ts` — DeckSummary 인터페이스 추가
- `src/core/services/StudySessionService.ts` — listDeckSummariesAsync 추가
- `src/features/home/screens/HomeScreen.tsx` — 피드 스타일로 전면 재작성
- `src/features/study/screens/StudyScreen.tsx` — Panel accentColor 제거
- `src/features/store/screens/StoreScreen.tsx` — Panel accentColor 제거
- `src/features/store/screens/BundleDetailScreen.tsx` — Panel accentColor 제거
- `src/features/profile/screens/ProfileScreen.tsx` — Panel accentColor 제거
- `src/features/decks/screens/MyDecksScreen.tsx` — Panel accentColor 제거
- `src/features/decks/screens/DeckEditorScreen.tsx` — Panel accentColor 제거
- `package.json` — react-native-svg 추가

### 의존성
- `react-native-svg` — expo install react-native-svg

## Scope Boundary

이 스펙에 포함되지 않는 항목:
- Badge 컴포넌트 리디자인
- AppButton 컴포넌트 리디자인
- Screen 컴포넌트 구조 변경
- 다크모드 대응
- 덱 카드 스와이프 삭제 등 제스처
- 학습 완료 애니메이션
- 덱 정렬/필터 기능
