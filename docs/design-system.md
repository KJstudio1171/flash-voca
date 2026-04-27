# Flash Voca Design System

## Typography

역할 기반 타이포그래피 토큰. `tokens.typography.*`로 사용한다.

| Token | Size | Weight | Line Height | 용도 |
|-------|------|--------|-------------|------|
| `screenTitle` | 32 | 800 | 38 | Screen 최상위 제목 |
| `pageTitleLarge` | 42 | 800 | 50 | 리디자인 탭 화면의 큰 제목 |
| `pageTitle` | 34 | 800 | 40 | 리디자인 보조 화면/상세 화면 제목 |
| `hero` | 26 | 800 | 32 | 강조 숫자, 히어로 제목, 가격 |
| `heading` | 20 | 700 | 26 | 섹션 제목, 덱 제목 |
| `subheading` | 16 | 700 | 22 | 리스트 아이템 제목 |
| `body` | 15 | 400 | 22 | 본문, 설명, 입력 필드 |
| `bodyBold` | 15 | 700 | 22 | 버튼 라벨, 강조 본문 |
| `caption` | 13 | 400 | 18 | 보조 정보, 메타데이터 |
| `captionBold` | 13 | 700 | 18 | 강조 보조 정보 |
| `label` | 12 | 700 | 16 | 뱃지, 작은 버튼, 힌트 |
| `micro` | 10 | 600 | 14 | 아주 작은 라벨, 통계 단위 |
| `flashcardTerm` | 46 | 800 | 54 | 학습 카드 앞면 단어 |
| `flashcardMeaning` | 36 | 800 | 44 | 학습 카드 뒷면 뜻 |

### 사용법

```tsx
const styles = StyleSheet.create({
  title: {
    ...tokens.typography.heading,
    // 추가 스타일이 필요하면 spread 뒤에
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
```

### 플래시카드 전용 타이포

`StudyFlashcard.tsx`는 일반 본문 토큰 대신 `flashcardTerm`, `flashcardMeaning`을 사용한다. 학습 카드의 가독성을 위해 화면 제목/본문 스케일과 분리한다.

### 어떤 토큰을 써야 할지 모르겠을 때

```
화면 제목인가? → screenTitle
리디자인 탭 화면의 큰 제목인가? → pageTitleLarge
리디자인 보조 화면 제목인가? → pageTitle
큰 숫자나 강조 제목인가? → hero
섹션 제목인가? → heading
리스트 아이템 제목인가? → subheading
일반 텍스트인가? → body (강조면 bodyBold)
보조 정보인가? → caption (강조면 captionBold)
뱃지, 작은 버튼 라벨인가? → label
아주 작은 텍스트인가? → micro
```

## Spacing

기본 간격 스케일 (`tokens.spacing.*`):

| Token | Value | 용도 |
|-------|-------|------|
| `xs` | 6 | 밀접한 요소 간격 (예: 텍스트-텍스트) |
| `s` | 12 | 인라인 간격 (예: 버튼 행, 카드 내부 요소) |
| `m` | 16 | 중간 간격 |
| `l` | 20 | 표준 간격 (패딩, 섹션 간격) |
| `xl` | 28 | 넓은 간격 |
| `xxl` | 36 | 가장 넓은 간격 |

### 시맨틱 간격 (`tokens.layout.*`)

용도별 이름이 부여된 간격. 값은 spacing과 동일하지만, "어디에 쓰는지"가 명확하다.

| Token | Value | 용도 |
|-------|-------|------|
| `screenPadding` | 20 | Screen 좌우 패딩 |
| `sectionGap` | 20 | 섹션 간 세로 간격 |
| `cardPadding` | 20 | Panel/카드 내부 패딩 |
| `cardGap` | 12 | 카드 내부 요소 간격 |
| `inlineGap` | 12 | 버튼 행 등 가로 간격 |
| `stackGap` | 6 | 밀접한 세로 요소 간격 |

### 어떤 간격을 써야 할지 모르겠을 때

```
Screen 좌우 여백? → layout.screenPadding
섹션과 섹션 사이? → layout.sectionGap (또는 spacing.l)
카드 안쪽 여백? → layout.cardPadding (또는 spacing.l)
카드 안에서 요소 사이? → layout.cardGap (또는 spacing.s)
버튼들 사이 가로 간격? → layout.inlineGap (또는 spacing.s)
아주 가까운 요소 사이? → layout.stackGap (또는 spacing.xs)
```

## Elevation

카드형 대시보드 UI에서 쓰는 shadow/elevation 토큰. `tokens.elevation.*`로 사용한다.

| Token | 용도 |
|-------|------|
| `card` | 홈 요약 카드처럼 가장 강조되는 surface |
| `soft` | 추천 배너, 최근 활동, 빠른 실행 같은 보조 surface |

React Native의 iOS shadow와 Android elevation을 함께 포함한다. 색상 의미가 필요한 경우에는 컴포넌트에서 theme color를 별도로 적용한다.

## Components

### AppScreenFrame

탭/스택 화면의 공통 외곽 프레임. SafeArea, canvas 배경, 기본 좌우 패딩, ScrollView, 하단 inset을 담당한다.

```tsx
<AppScreenFrame bottomInset="tabs" contentStyle={styles.content}>
  {children}
</AppScreenFrame>
```

- `bottomInset`: `default`, `tabs`, `fab`, `none`
- `headerSlot`: 학습/상세 화면처럼 상단 고정 바가 필요한 경우 사용
- `floatingSlot`: FAB처럼 스크롤 영역 밖에 고정되어야 하는 요소에 사용

### ScreenSection

섹션 제목 + 선택적 우측 슬롯 + 본문을 묶는 화면 섹션 컴포넌트.

```tsx
<ScreenSection title="Recent">
  <RecentActivityCard />
</ScreenSection>
```

### CardSurface

리디자인 화면에서 쓰는 표면 카드. surface 배경, border, padding, elevation을 일관되게 적용한다.

```tsx
<CardSurface elevation="soft">
  <Text>Content</Text>
</CardSurface>
```

- `elevation`: `none`, `soft`, `card`
- `padding`: `none`, `s`, `m`, `l`

### QuickActions

홈/학습 허브의 빠른 실행 그리드.

```tsx
<QuickActions actions={actions} columns={4} />
```

- 기본 4열, 필요 시 `columns={2 | 3 | 4}`로 변경
- `compact`는 작은 카드 비율이 필요한 화면에서 사용

### Panel

기존 폼/설정류 화면의 범용 컨테이너. 새 리디자인 탭 화면에서는 `CardSurface`를 우선 사용한다.

```tsx
<Panel>
  <Badge tone="info">Status</Badge>
  <Text style={[styles.title, { color: colors.ink }]}>Title</Text>
  <Text style={[styles.body, { color: colors.muted }]}>Description</Text>
</Panel>
```

- variant 없음 — 내부 콘텐츠(Badge 톤, 텍스트)가 맥락을 표현
- `style` prop으로 레이아웃 조정 가능

### AppButton

3가지 variant: `primary`, `secondary`, `ghost`.

```tsx
<AppButton onPress={handler}>Primary Action</AppButton>
<AppButton variant="secondary" onPress={handler}>Secondary</AppButton>
<AppButton variant="ghost" onPress={handler}>Ghost</AppButton>
```

### Badge

상태/카테고리 표시. 3가지 tone: `primary`, `accent`, `info`.

```tsx
<Badge tone="primary">Active</Badge>
<Badge tone="accent">Error</Badge>
<Badge tone="info">Info</Badge>
```

### CircularProgress

원형 프로그레스 표시. `progress`는 0~1.

```tsx
<CircularProgress progress={0.73} />
<CircularProgress size={36} strokeWidth={3} progress={0.5} color={colors.accent} />
```

## Color System

4개 팔레트 (cool-modern, warm-refresh, nature-fresh, neutral-clean). `useTheme()`으로 현재 팔레트의 색상에 접근.

```tsx
const { colors } = useTheme();
// colors.ink, colors.muted, colors.primary, colors.surface, etc.
```

색상 토큰 전체 목록은 `src/shared/theme/palettes/types.ts` 참조.
