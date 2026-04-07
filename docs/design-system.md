# Flash Voca Design System

## Typography

역할 기반 타이포그래피 토큰. `tokens.typography.*`로 사용한다.

| Token | Size | Weight | Line Height | 용도 |
|-------|------|--------|-------------|------|
| `screenTitle` | 32 | 800 | 38 | Screen 최상위 제목 |
| `hero` | 26 | 800 | 32 | 강조 숫자, 히어로 제목, 가격 |
| `heading` | 20 | 700 | 26 | 섹션 제목, 덱 제목 |
| `subheading` | 16 | 700 | 22 | 리스트 아이템 제목 |
| `body` | 15 | 400 | 22 | 본문, 설명, 입력 필드 |
| `bodyBold` | 15 | 700 | 22 | 버튼 라벨, 강조 본문 |
| `caption` | 13 | 400 | 18 | 보조 정보, 메타데이터 |
| `captionBold` | 13 | 700 | 18 | 강조 보조 정보 |
| `label` | 12 | 700 | 16 | 뱃지, 작은 버튼, 힌트 |
| `micro` | 10 | 600 | 14 | 아주 작은 라벨, 통계 단위 |

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

### 예외: 플래시카드 전용 타이포

`StudyFlashcard.tsx`와 `SwipeStudyCard.tsx`의 타이포그래피는 일반 토큰을 사용하지 않는다. 학습 카드의 term(34px), meaning(32px) 등은 해당 컴포넌트에서 로컬로 관리한다.

### 어떤 토큰을 써야 할지 모르겠을 때

```
화면 제목인가? → screenTitle
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

## Components

### Panel

범용 컨테이너. 단순한 surface 배경 + 1px border.

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

### Screen

모든 탭/스택 화면의 기본 레이아웃.

```tsx
<Screen
  title="Page Title"
  subtitle="Optional description"
  rightSlot={<AppButton variant="secondary">Action</AppButton>}
  scroll={true}
>
  {children}
</Screen>
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
