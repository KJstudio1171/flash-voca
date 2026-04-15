# Animation System Extension Design

## Overview

`2026-04-10-animation-system-design.md`에서 합의된 모션 토큰/프리셋 시스템을 실제로 구현하고, **네비게이션 전이(Stack/Tabs)** 를 같은 토큰 체계 안으로 편입한다. 현재 페이지 이동 시 애니메이션이 거의 없고(Expo Router 기본값), 설계된 토큰/프리셋 파일도 아직 존재하지 않는다. 이 스펙은 두 공백을 한 번에 메운다.

## Goals & Non-Goals

### Goals
- `motionTokens.ts` / `motionPresets.ts`를 신규 구현
- 기존 3개 애니메이션 컴포넌트(`AnimatedScreen`, `AnimatedFlipCard`, `SwipeStudyCard`)를 토큰 기반으로 교체 (동작 동일)
- `ToastContainer`를 RN `Animated`에서 Reanimated `entering`/`exiting`으로 마이그레이션
- 홈·덱관리·스터디·세션완료·스토어·번들상세 UI에 프리셋 통합
- 신규 유틸: `SkeletonShimmer`, `useScalePress`, `useCountUp`
- 네비게이션 전이 프리셋 신설 및 `app/_layout.tsx` / `app/(tabs)/_layout.tsx`에 적용

### Non-Goals
- OS Reduced Motion 접근성 대응 (추후 별도 이슈)
- 신규 토큰 카테고리(제스처/상태) 추가
- 기존 토큰 값(duration/easing/spring/delay) 변경

## Design Decisions

- **톤 분리**: 화면 내부 요소는 playful(bouncy, 오버슈트 허용), 네비게이션 전이는 차분하게(standard easing 중심).
- **네비게이션 계층 구분**: 일반 푸시는 `slide_from_right`, 몰입형 화면(`study/[deckId]`, `bundles/[bundleId]`)은 `slide_from_bottom`로 "집중 모드" 진입 뉘앙스.
- **탭 전이**: `shift` 애니메이션으로 탭 순서 공간감 유지.
- **토큰 조직**: 기존 `motionTokens` 구조는 원시 값 유지. 네비게이션 전용 값은 `motionPresets.ts`에 프리셋 함수(`stackPushOptions()` 등)로 집약. `motionTokens`에 `navigation` 서브카테고리를 만들지 않음(원시 값 계약 유지).

## Architecture

```
motionTokens.ts (원시 값)
       ↓
motionPresets.ts (엔터링 / 인터랙션 / 전이 / 네비게이션 프리셋)
       ↓
Components + app/_layout.tsx + app/(tabs)/_layout.tsx
```

### File Structure

```
src/shared/animation/
├── motionTokens.ts         # 신규
├── motionPresets.ts        # 신규
├── SkeletonShimmer.tsx     # 신규
├── useScalePress.ts        # 신규
├── useCountUp.ts           # 신규
├── AnimatedScreen.tsx      # 토큰화
├── AnimatedFlipCard.tsx    # 토큰화
└── SwipeStudyCard.tsx      # 토큰화
```

## Motion Tokens

`motionTokens.ts`에 4개 카테고리(값은 2026-04-10 설계 그대로).

### duration
| Token | Value | Usage |
|-------|-------|-------|
| instant | 100ms | press feedback |
| fast | 200ms | toast, tab shift |
| normal | 350ms | screen enter, flip, stack push |
| slow | 500ms | 시퀀스, shimmer |

### easing
| Token | Value | Usage |
|-------|-------|-------|
| standard | bezier(0.4, 0.0, 0.2, 1) | 범용, 네비게이션 |
| decelerate | bezier(0.0, 0.0, 0.2, 1) | 진입 |
| accelerate | bezier(0.4, 0.0, 1, 1) | 퇴장 |
| playful | bezier(0.34, 1.56, 0.64, 1) | 오버슈트 |

### spring
| Token | Config | Usage |
|-------|--------|-------|
| gentle | { damping: 20, stiffness: 180 } | 부드러운 전환 |
| bouncy | { damping: 12, stiffness: 260 } | 통통 튀는 효과 |
| snappy | { damping: 18, stiffness: 320 } | 빠른 반응 |

### delay
| Token | Value | Usage |
|-------|-------|-------|
| stagger | 50ms | 리스트 순차 등장 |
| short | 100ms | 짧은 지연 |
| medium | 200ms | 중간 지연 |

## Preset Functions

### Entering (Reanimated layout animation 객체 반환)

| Preset | Description |
|--------|-------------|
| `fadeInUp(delay?)` | opacity 0→1 + translateY 24→0, spring.bouncy |
| `fadeInDown(delay?)` | opacity 0→1 + translateY -24→0, spring.bouncy |
| `fadeInScale(delay?)` | opacity 0→1 + scale 0.85→1, easing.playful |
| `bounceIn(delay?)` | scale 0→1.08→1, spring.bouncy |
| `staggeredList(index)` | fadeInUp(delay.stagger * index) |
| `cardStackEnter()` | scale 0.9→1 + translateY 40→0 + fade in, spring.bouncy |

### Interaction

| Preset | Description |
|--------|-------------|
| `useScalePress()` | `{ animatedStyle, pressHandlers }` — pressIn scale 0.96, pressOut spring back (spring.snappy) |
| `useCountUp(target)` | SharedValue — withTiming + easing.decelerate, duration.normal |

### Loading

| Preset | Description |
|--------|-------------|
| `<SkeletonShimmer />` | expo-linear-gradient + translateX 반복 (duration.slow) |

### Navigation (신규)

| Preset | Returns | Usage |
|--------|---------|-------|
| `stackPushOptions()` | `{ animation: "slide_from_right", animationDuration: duration.normal }` | Stack 기본 `screenOptions` |
| `modalPushOptions()` | `{ animation: "slide_from_bottom", animationDuration: duration.normal }` | `study/[deckId]`, `bundles/[bundleId]` 개별 덮어쓰기 |
| `tabShiftOptions()` | `{ animation: "shift", animationDuration: duration.fast }` | Tabs `screenOptions` |

## Navigation Integration

### `app/_layout.tsx`
- Stack `screenOptions`에 `...stackPushOptions()` 스프레드.
- `<Stack.Screen name="study/[deckId]" options={modalPushOptions()} />` 및 `<Stack.Screen name="bundles/[bundleId]" options={modalPushOptions()} />`로 개별 덮어쓰기.

### `app/(tabs)/_layout.tsx`
- Tabs `screenOptions`에 `...tabShiftOptions()` 스프레드.

## UI Integration Mapping

| 화면/컴포넌트 | 프리셋 |
|---|---|
| `AnimatedScreen` 공통 래퍼 | `fadeInUp()` (기존 `FadeInDown` 교체) |
| Home — 덱 리스트 | `staggeredList(index)` |
| Home — 덱 카드 탭 | `useScalePress()` |
| Home — 빈 상태 패널 | `fadeInScale()` |
| My Decks — 덱 목록 | `staggeredList(index)` |
| My Decks — 덱 카드 탭 | `useScalePress()` |
| Study — 다음 카드 등장 | `cardStackEnter()` |
| `AnimatedFlipCard` / `SwipeStudyCard` | 토큰 치환만 |
| Session Complete — 카드 루트 | `bounceIn()` |
| Session Complete — 통계 숫자 | `useCountUp(target)` |
| Session Complete — 배지/라벨 | `fadeInUp(delay.stagger * i)` |
| Store — 번들 목록 | `staggeredList(index)` |
| Store — 번들 카드 탭 | `useScalePress()` |
| BundleDetail — 진입 | `fadeInUp()` |
| ToastContainer | `entering={fadeInDown()}`, `exiting={FadeOut.duration(duration.fast)}` |
| AppButton — 탭 피드백 | `useScalePress()` |
| 로딩 상태 | `<SkeletonShimmer />` |

## Migration Sequence

독립적으로 커밋 가능한 단위로 나눈다.

1. **토큰 + 프리셋 기반 추가** — `motionTokens.ts`, `motionPresets.ts`(Entering/Interaction/Navigation), 단위 테스트. UI 변화 없음.
2. **기존 3개 컴포넌트 토큰화** — `AnimatedScreen` / `AnimatedFlipCard` / `SwipeStudyCard`. 하드코딩 숫자 → 토큰 참조.
3. **네비게이션 전이 적용** — `app/_layout.tsx` + `app/(tabs)/_layout.tsx`에 프리셋 스프레드.
4. **Toast Reanimated 마이그레이션** — `ToastContainer.tsx` RN `Animated` 제거.
5. **신규 유틸 추가** — `useScalePress`, `useCountUp`, `SkeletonShimmer` + `expo-linear-gradient` 의존성 추가.
6. **UI 통합** — Home → My Decks → Study → Session Complete → Store → BundleDetail → AppButton. 화면 단위로 커밋 분리.

## Testing

### New Test Files

```
__tests__/shared/animation/motionPresets.test.ts
__tests__/shared/animation/useScalePress.test.ts
__tests__/shared/animation/navigationPresets.test.ts
```

### Test Coverage
- `motionPresets.test.ts` — 엔터링 프리셋이 기대하는 shape(Reanimated 객체의 `duration`/`damping`/`stiffness` 속성)를 반환하는지 검증.
- `useScalePress.test.ts` — pressIn/pressOut 시 shared value 변화 검증.
- `navigationPresets.test.ts` — `stackPushOptions()` / `modalPushOptions()` / `tabShiftOptions()`가 정확한 `animation` 문자열과 `animationDuration` 토큰 값을 반환하는지 검증.
- 기존 컴포넌트 테스트(`AnimatedFlipCard`, `SwipeStudyCard`, `ToastContainer`) — 동작 동일 유지.
- 네비게이션 실제 전이 동작은 Android 기기/에뮬레이터 수동 QA.

## Risks & Mitigations

| 리스크 | 대응 |
|---|---|
| Reanimated 4.x + RN 0.81 호환성 이슈 | 1단계 이후 Android 스모크. 실패 시 `FadeInDown` fallback 롤백. |
| `modalPushOptions()`가 Android 예측형 뒤로가기와 충돌 | `study/[deckId]` 수동 QA. 필요 시 `gestureDirection: "vertical"`. |
| 6단계 UI 통합 대규모 변경 | 화면 단위 커밋/PR 분리. |
| Toast 마이그레이션 중 기존 테스트 실패 | `react-native-reanimated/mock` 적용, `jest.useFakeTimers()` 유지. |
| `expo-linear-gradient` 네이티브 의존성 추가 | PR 설명에 `npx expo run:android` 재빌드 필요 명시. |

## Dependencies

| Package | Status | Purpose |
|---------|--------|---------|
| react-native-reanimated | 설치됨 | 엔진 |
| react-native-gesture-handler | 설치됨 | scalePress |
| react-native-screens | 설치됨 | native-stack 전이 |
| expo-linear-gradient | 추가 필요 | SkeletonShimmer |

## Completion Criteria

- `npm run typecheck` / `npm run lint` / `npm test` 전부 통과
- Android 기기/에뮬레이터에서 Stack push 슬라이드, 모달형 화면의 bottom slide, Tab shift가 실제로 관찰됨
- 리포에 `duration: <literal>` 또는 `damping/stiffness` 매직 넘버가 남지 않음
- 신규 테스트 및 기존 3개 컴포넌트 테스트 모두 통과

## Change Summary

| Category | Files |
|----------|-------|
| New | motionTokens.ts, motionPresets.ts, SkeletonShimmer.tsx, useScalePress.ts, useCountUp.ts |
| Token migration | AnimatedFlipCard.tsx, SwipeStudyCard.tsx, AnimatedScreen.tsx |
| Reanimated migration | ToastContainer.tsx |
| Navigation | app/_layout.tsx, app/(tabs)/_layout.tsx |
| UI integration | HomeScreen, MyDecksScreen, StudyScreen, SessionCompleteCard, StoreScreen, BundleDetailScreen, AppButton, 로딩 UI |
| New tests | motionPresets.test.ts, useScalePress.test.ts, navigationPresets.test.ts |
| New dependency | expo-linear-gradient |
