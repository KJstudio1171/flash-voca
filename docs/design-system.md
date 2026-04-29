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

### 장식적 로컬 타이포 (예외)

다음 케이스는 토큰을 강제하지 않고 컴포넌트 내부에 직접 `fontSize`를 둔다:

- **이모지 아이콘 크기** (trophy, crown 등) — 시각 비율로만 결정되는 1회성 크기
- **덱/번들 커버 라벨** — 카드 내부에서 컴포지션 비율로 정해지는 텍스트
- **가격 표시** — 카드별 디자인 비율
- **플래시카드 단/뜻** — `flashcardTerm`, `flashcardMeaning` 토큰 사용

장식적 로컬 사용이라는 의도가 명확하도록, 컴포넌트 안에서 한 곳에 모아두고 다른 컴포넌트가 재사용하지 않도록 한다.

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
장식적 1회성 크기인가? → 컴포넌트 내부에 inline (위 예외 참고)
```

## Spacing

기본 간격 스케일 (`tokens.spacing.*`):

| Token | Value | 용도 |
|-------|-------|------|
| `none` | 0 | 명시적 0 간격 |
| `xxs` | 4 | 매우 밀접한 요소 (아이콘-라벨 등) |
| `xs` | 6 | 밀접한 요소 간격 (텍스트-텍스트) |
| `s` | 12 | 인라인 간격 (버튼 행, 카드 내부 요소) |
| `m` | 16 | 중간 간격 |
| `l` | 20 | 표준 간격 (패딩, 섹션 간격) |
| `xl` | 28 | 넓은 간격 |
| `xxl` | 36 | 매우 넓은 간격 |
| `xxxl` | 48 | 가장 넓은 간격 (섹션 분리) |

### 시맨틱 간격 (`tokens.layout.*`)

용도별 이름이 부여된 간격. 값은 spacing과 동일하지만 "어디에 쓰는지"가 명확하다.

| Token | Value | 용도 |
|-------|-------|------|
| `screenPadding` | 20 | Screen 좌우 패딩 |
| `sectionGap` | 20 | 섹션 간 세로 간격 |
| `cardPadding` | 20 | Panel/카드 내부 패딩 |
| `cardGap` | 12 | 카드 내부 요소 간격 |
| `inlineGap` | 12 | 버튼 행 등 가로 간격 |
| `stackGap` | 6 | 밀접한 세로 요소 간격 |

## Radius

| Token | Value | 용도 |
|-------|-------|------|
| `none` | 0 | 명시적 직각 |
| `xs` | 6 | 작은 칩, 인풋 마이크로 요소 |
| `s` | 12 | 작은 카드, 토글 |
| `m` | 18 | 버튼, 일반 카드 |
| `l` | 24 | 큰 카드, 패널 |
| `pill` | 999 | 캡슐형 (필 버튼, 칩) |

## Border Width

| Token | Value | 용도 |
|-------|-------|------|
| `none` | 0 | 명시적 무 테두리 |
| `hairline` | 1 | 일반 테두리 (대부분의 케이스) |
| `thick` | 2 | 강조 테두리 (포커스, 셀렉트 액티브) |

## Opacity

| Token | Value | 용도 |
|-------|-------|------|
| `prominent` | 0.9 | 거의 불투명한 레이어 (강조 일러스트, 잠금 뱃지) |
| `pressed` | 0.7 | 눌림 피드백 |
| `overlay` | 0.5 | 모달 dim 등 가벼운 오버레이 |
| `disabled` | 0.45 | 비활성 컴포넌트 |
| `glow` | 0.18 | 데코레이션용 약한 글로우 |
| `subtle` | 0.08 | 매우 약한 하이라이트 |

## Icon Size

| Token | Value | 용도 |
|-------|-------|------|
| `s` | 16 | 인라인 아이콘 (텍스트 옆) |
| `m` | 20 | 표준 액션 아이콘 |
| `l` | 24 | 카드/리스트 아이콘 |
| `xl` | 32 | 강조 아이콘 (FAB 내부 등) |

## Z-Index

레이어링 충돌을 막기 위한 표준 스택. 매직 넘버 대신 사용한다.

| Token | Value | 용도 |
|-------|-------|------|
| `base` | 0 | 기본 흐름 |
| `raised` | 10 | 카드 hover, 드롭섀도우 강조 |
| `sticky` | 20 | 헤더, 탭 바 |
| `fab` | 30 | Floating Action Button |
| `overlay` | 40 | 모달 배경 dim |
| `modal` | 50 | 모달 컨텐츠 |
| `toast` | 60 | 토스트, 알림 |

## Motion

애니메이션 토큰은 `src/shared/animation/motionTokens.ts`의 `motion` 객체로 제공된다 (`tokens`와 별도 — Easing이 reanimated에 의존하기 때문).

```tsx
import { motion } from "@/src/shared/animation/motionTokens";

withTiming(1, {
  duration: motion.duration.fast,
  easing: motion.easing.standard,
});
```

| Duration | Value (ms) | 용도 |
|----------|------------|------|
| `instant` | 100 | 마이크로 인터랙션 (토글, 프레스 피드백) |
| `fast` | 200 | 일반 트랜지션 |
| `normal` | 350 | 화면 내 큰 변화 |
| `slow` | 500 | 강조 트랜지션, 카드 플립 |

| Easing | 용도 |
|--------|------|
| `standard` | 기본 (Material Standard curve) |
| `decelerate` | 진입 (들어옴) |
| `accelerate` | 퇴장 (나감) |
| `playful` | 오버슛 스프링 느낌 |

| Spring | 용도 |
|--------|------|
| `gentle` | 부드러운 진입 |
| `bouncy` | 바운스 강조 |
| `snappy` | 빠른 스냅 |

`motion.delay.{stagger, short, medium}`은 시퀀스 진입 지연용.

## Elevation

카드형 UI의 shadow/elevation 토큰. iOS shadow + Android elevation 동시 포함.

| Token | 용도 |
|-------|------|
| `none` | 명시적 그림자 제거 |
| `soft` | 추천 배너, 최근 활동, 빠른 실행 같은 보조 surface |
| `card` | 홈 요약 카드처럼 가장 강조되는 surface |
| `modal` | FAB, 모달, 바텀시트 등 떠 있는 표면 |

## Color System

4개 팔레트 (cool-modern, warm-refresh, nature-fresh, neutral-clean). 각 팔레트는 light/dark 두 모드를 가진다. `useTheme()`으로 현재 모드의 색상에 접근.

```tsx
const { colors } = useTheme();
// colors.ink, colors.muted, colors.primary, colors.success, ...
```

### 핵심 색상

| Token | 용도 |
|-------|------|
| `canvas` | Screen 배경 |
| `surface` | 카드/패널 배경 |
| `surfaceStrong` | 더 강조된 surface (secondary 버튼 배경 등) |
| `ink` | 본문 텍스트 |
| `muted` | 보조 텍스트, 비활성 라벨 |
| `line` | 구분선, 테두리 |
| `onPrimary` | primary 위 텍스트 색 |

### 브랜드 / 시맨틱 색상

각 색상은 `*` (강조)과 `*Soft` (배경 톤) 페어로 제공된다.

| Pair | 용도 |
|------|------|
| `primary` / `primarySoft` / `primarySoftStrong` | 주 브랜드, CTA |
| `accent` / `accentSoft` | 강조, 차별화 요소 |
| `info` / `infoSoft` | 정보성 (안내, 메타) |
| `success` / `successSoft` | 성공, 완료, 긍정 상태 |
| `warning` / `warningSoft` | 주의, 경고 |
| `danger` / `dangerSoft` | 오류, 위험, 파괴적 액션 |

새로운 상태 색이 필요할 때 컴포넌트 전용 토큰(`somethingBg/Border`)을 추가하지 말고 위 시맨틱 색상에서 골라 쓴다.

### 보조 / glow / overlay

| Token | 용도 |
|-------|------|
| `overlayWhite` | 라이트 톤 오버레이 (라이트 모드 카드 위 광택 등) |
| `overlayBlack` | 다크 톤 오버레이 (모달 dim 등) |
| `primaryGlow` / `accentGlow` / `neutralGlow` | 약한 컬러 glow (블러/그라데이션 배경) |
| `cardShadowFront` / `cardShadowBack` | 학습 카드 듀얼 셰도우 색 |

SRS 학습 평가 칩(Again/Easy)도 시맨틱 색상을 그대로 사용한다 — Again은 `danger`/`dangerSoft`, Easy는 `success`/`successSoft`.

색상 토큰 전체 목록은 `src/shared/theme/palettes/types.ts` 참조.

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

### CardSurface

리디자인 화면에서 쓰는 표면 카드. surface 배경, border, padding, elevation을 일관되게 적용한다.

- `elevation`: `none`, `soft`, `card`
- `padding`: `none`, `s`, `m`, `l`

### Panel

기존 폼/설정류 화면의 범용 컨테이너. 새 리디자인 탭 화면에서는 `CardSurface`를 우선 사용한다.

### QuickActions

홈/학습 허브의 빠른 실행 그리드. 기본 4열, 필요 시 `columns={2 | 3 | 4}`로 변경. `compact`는 작은 카드 비율이 필요한 화면에서 사용.

### AppButton

3가지 variant: `primary`, `secondary`, `ghost`. `disabled`는 `tokens.opacity.disabled`로 처리.

### Badge

상태/카테고리 표시. tone: `primary`, `accent`, `info`. (필요시 `success`, `warning`, `danger` tone 추가 가능 — 시맨틱 색상 토큰을 그대로 쓰면 된다.)

### TextField

폼 입력 컴포넌트. surface 배경, line 테두리, focus 시 primary 강조.

### FloatingActionButton

화면 우하단 고정 액션. `tokens.zIndex.fab`, `tokens.elevation.modal`을 사용한다.

### Toast (`shared/ui/toast`)

화면 최상단 알림. `tokens.zIndex.toast`로 최상위 레이어. 메시지는 i18n 키 기반.

### CircularProgress

원형 프로그레스 표시. `progress`는 0~1.

### 플래시카드 폰트 (`shared/theme/flashcardFonts`)

플래시카드 단/뜻에 사용할 폰트 패밀리 옵션. `useTheme().flashcardTextStyle`로 접근. 폰트 자체는 user 설정.
