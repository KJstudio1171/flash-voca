# Animation System Design

## Overview

Flash Voca 앱 전체에 일관된 모션 언어를 적용하기 위한 애니메이션 시스템. 모션 토큰으로 원시 값을 중앙 관리하고, 프리셋 함수로 재사용 가능한 애니메이션 패턴을 제공한다.

## Design Decisions

- **모션 톤**: 재미있고 활기찬 — 바운스, 오버슈트 등 플레이풀한 모션
- **아키텍처**: 토큰 + 프리셋 함수 (래퍼 컴포넌트 없이 직접 사용)
- **엔진 통일**: 모든 애니메이션을 `react-native-reanimated`로 통일 (기존 RN Animated 제거)
- **토큰 파일 분리**: `tokens.ts`와 별도로 `motionTokens.ts` 관리 (spring config, easing 등 복잡한 객체 포함)

## Architecture

```
motionTokens.ts (원시 값)
       ↓
motionPresets.ts (조합된 함수)
       ↓
Components (화면/UI 요소)
```

### File Structure

```
src/shared/animation/
├── motionTokens.ts       # 원시 값 (duration, spring, easing, delay)
├── motionPresets.ts       # 프리셋 함수 (fadeInUp, bounceIn, etc.)
├── useScalePress.ts       # 탭 피드백 커스텀 훅
├── SkeletonShimmer.tsx    # 쉬머 로딩 컴포넌트
├── AnimatedFlipCard.tsx   # 기존 (토큰 적용)
├── SwipeStudyCard.tsx     # 기존 (토큰 적용)
└── AnimatedScreen.tsx     # 기존 (토큰 적용)
```

## Motion Tokens

`motionTokens.ts`에 정의되는 4가지 카테고리:

### duration

| Token | Value | Usage |
|-------|-------|-------|
| instant | 100ms | 마이크로 인터랙션 (press feedback) |
| fast | 200ms | 빠른 전환 (toast, fade) |
| normal | 350ms | 표준 전환 (screen enter, flip) |
| slow | 500ms | 느린 전환 (복잡한 시퀀스) |

### easing

| Token | Value | Usage |
|-------|-------|-------|
| standard | bezier(0.4, 0.0, 0.2, 1) | 범용 |
| decelerate | bezier(0.0, 0.0, 0.2, 1) | 진입 |
| accelerate | bezier(0.4, 0.0, 1, 1) | 퇴장 |
| playful | bezier(0.34, 1.56, 0.64, 1) | 오버슈트 효과 |

### spring

| Token | Config | Usage |
|-------|--------|-------|
| gentle | { damping: 20, stiffness: 180 } | 부드러운 전환 |
| bouncy | { damping: 12, stiffness: 260 } | 통통 튀는 효과 |
| snappy | { damping: 18, stiffness: 320 } | 빠른 반응 |

### delay

| Token | Value | Usage |
|-------|-------|-------|
| stagger | 50ms | 리스트 아이템 순차 등장 |
| short | 100ms | 짧은 지연 |
| medium | 200ms | 중간 지연 |

## Preset Functions

`motionPresets.ts`에서 제공하는 프리셋:

### Entering Presets

| Preset | Description |
|--------|-------------|
| `fadeInUp()` | opacity 0→1 + translateY 24→0, bouncy spring |
| `fadeInDown()` | opacity 0→1 + translateY -24→0, bouncy spring |
| `fadeInScale()` | opacity 0→1 + scale 0.85→1, 오버슈트 |
| `bounceIn()` | scale 0→1.08→1, bouncy spring |
| `staggeredList(index)` | fadeInUp + index * stagger delay |

### Interaction Presets

| Preset | Description |
|--------|-------------|
| `useScalePress()` | pressIn: scale 0.96, pressOut: spring back to 1. animatedStyle + pressHandlers 반환 |

### Transition Presets

| Preset | Description |
|--------|-------------|
| `cardStackEnter()` | 다음 카드: scale 0.9→1 + translateY 40→0 + fade in, bouncy spring |

### Value Presets

| Preset | Description |
|--------|-------------|
| `useCountUp(target)` | 숫자 0→target을 애니메이션하는 커스텀 훅. SharedValue 반환, withTiming + easing decelerate |

### Loading Presets

| Preset | Description |
|--------|-------------|
| `shimmer()` | LinearGradient + translateX 반복 애니메이션 |

## UI Element Mapping

### Home Screen
- DeckCard 목록 → `staggeredList()`
- DeckCard 탭 → `useScalePress()`
- 빈 상태 Panel → `fadeInScale()`

### Study Screen
- 다음 카드 등장 → `cardStackEnter()`
- FlipCard → 기존 유지 (토큰 적용)
- SwipeCard → 기존 유지 (토큰 적용)

### Session Complete
- 카드 등장 → `bounceIn()`
- 통계 숫자 → `useCountUp()`
- 배지/라벨 → `fadeInUp()` stagger

### My Decks
- 덱 목록 → `staggeredList()`
- 덱 카드 탭 → `useScalePress()`

### Store / Bundle Detail
- 번들 목록 → `staggeredList()`
- 번들 카드 탭 → `useScalePress()`
- Detail 진입 → `fadeInUp()`

### Common
- Screen 진입 → `fadeInUp()`
- 버튼/카드 탭 → `useScalePress()`
- 로딩 상태 → `SkeletonShimmer`
- Toast → `fadeInDown()` / FadeOut

## Migration Plan

### Existing Components — Token Replacement

하드코딩된 값만 토큰으로 교체. 로직 변경 없음.

**AnimatedFlipCard.tsx**
- `duration: 500` → `motion.duration.normal`
- `Easing.bezier(0.4, 0.0, 0.2, 1)` → `motion.easing.standard`

**SwipeStudyCard.tsx**
- `duration: 180` → `motion.duration.fast`
- `{ damping: 18, stiffness: 220 }` → `motion.spring.snappy`

**AnimatedScreen.tsx**
- `.duration(420)` → `.duration(motion.duration.normal)`

### ToastContainer — Reanimated Migration

RN 기본 `Animated` API에서 Reanimated `entering`/`exiting` 방식으로 전환.
- `useRef(new Animated.Value(0))` → `entering={fadeInDown()}`
- `Animated.timing` fade out → `exiting={FadeOut.duration(motion.duration.fast)}`

## New Components

### SkeletonShimmer

`expo-linear-gradient` + Reanimated translateX 반복으로 쉬머 효과를 제공하는 컴포넌트.

Props:
- `width: number | string`
- `height: number`
- `borderRadius?: number`

### useScalePress Hook

Pressable 탭 피드백을 위한 커스텀 훅.

Returns:
- `animatedStyle` — scale 애니메이션이 적용된 스타일
- `pressHandlers` — `{ onPressIn, onPressOut }` 핸들러

## Dependencies

| Package | Status | Purpose |
|---------|--------|---------|
| react-native-reanimated | 이미 설치됨 | 모든 애니메이션 엔진 |
| react-native-gesture-handler | 이미 설치됨 | scalePress 제스처 |
| expo-linear-gradient | 추가 필요 | SkeletonShimmer 그라데이션 |

## Testing

- **motionTokens.ts** — 순수 값 객체, 타입 체크로 충분
- **motionPresets.ts** — 프리셋 함수가 올바른 Reanimated 객체를 반환하는지 단위 테스트
- **useScalePress.ts** — pressIn/pressOut 시 animatedStyle 값 변화 검증
- **기존 컴포넌트** — 기존 테스트 통과 확인 (동작 변경 없음)

### New Test Files

```
__tests__/shared/animation/motionPresets.test.ts
__tests__/shared/animation/useScalePress.test.ts
```

## Change Summary

| Category | Files |
|----------|-------|
| New files | motionTokens.ts, motionPresets.ts, SkeletonShimmer.tsx, useScalePress.ts |
| Token migration | AnimatedFlipCard.tsx, SwipeStudyCard.tsx, AnimatedScreen.tsx |
| Reanimated migration | ToastContainer.tsx |
| Animation integration | HomeScreen, DeckCard, StudyScreen, SessionCompleteCard, MyDecksScreen, StoreScreen, BundleDetailScreen, AppButton + 기타 |
| New tests | motionPresets.test.ts, useScalePress.test.ts |
| New dependency | expo-linear-gradient |
