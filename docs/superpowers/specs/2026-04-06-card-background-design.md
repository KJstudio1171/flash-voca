# Card & Background Design Improvement — Design Spec

## Goal

플래시카드에 깊이감과 타이포그래피 위계를 부여하고, Screen 배경의 불필요한 orb 장식을 제거하여 깔끔한 UI로 개선한다.

## Design Decisions

| 항목 | 결정 |
|------|------|
| 카드 깊이감 | Soft Shadow 방식 — border 제거, primary/accent 톤 shadow |
| 카드 높이 | 고정값 → 화면 비율 기반 (height * 0.42, clamp 240–400) |
| 타이포 | 라벨 letter-spacing↑, 본문 letter-spacing tighter, hint 톤 다운 |
| mastery 배지 | 단색 → 그라데이션 배경 |
| Screen 배경 | orb 2개 제거, canvas 단색만 유지 |

## 1. 플래시카드 디자인

### Shadow 시스템

앞면과 뒷면을 border 대신 shadow 색상으로 구분한다.

**앞면 (TERM):**
```
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(primary, 0.08)
```

**뒷면 (MEANING):**
```
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(accent, 0.08)
```

React Native에는 CSS box-shadow가 없으므로 다음으로 구현한다:
- `elevation: 4` (Android)
- `shadowColor` + `shadowOffset` + `shadowOpacity` + `shadowRadius` (iOS)
- shadow 색상은 앞면 = primary, 뒷면 = accent

### 카드 높이

현재 `minHeight: 240` 고정값을 화면 비율 기반으로 변경한다.

```typescript
const CARD_HEIGHT = Math.min(400, Math.max(240, Dimensions.get("window").height * 0.42));
```

- 5인치 폰 (~667pt): 약 280
- 6.1인치 폰 (~844pt): 약 355
- 6.7인치 폰 (~932pt): 약 391

### 타이포그래피 조정

| 요소 | 현재 | 변경 |
|------|------|------|
| TERM/MEANING 라벨 | fontSize 11, letterSpacing 1.5 | fontSize 10, letterSpacing 2, fontWeight 600 |
| 앞면 본문 (term) | fontSize 36, fontWeight 800 | fontSize 34, fontWeight 800, letterSpacing -0.5 |
| 뒷면 본문 (meaning) | fontSize 34, fontWeight 800 | fontSize 32, fontWeight 800, letterSpacing -0.3 |
| hint ("tap to flip") | fontSize 14, color muted | fontSize 12, color muted (더 연하게) |
| swipeHint | fontSize 12, color muted | fontSize 11, color muted |

### Mastery 배지

현재: `backgroundColor: colors.primarySoft` (단색)

변경: 배지 배경에 시작색/끝색을 사용하여 미묘한 그라데이션을 적용한다. React Native에서는 `expo-linear-gradient` 또는 두 레이어 겹침으로 구현 가능하나, 의존성 추가를 피하기 위해 단순 접근을 취한다:

- 새 토큰 `primarySoftStrong`을 추가한다 (primarySoft보다 한 단계 진한 색)
- 배지 배경을 `primarySoftStrong`으로 변경한다 (그라데이션 대신 약간 더 진한 단색)

### Border 제거

| 요소 | 현재 | 변경 |
|------|------|------|
| cardFront | borderWidth: 1, borderColor: line | 제거 |
| cardBack | borderWidth: 2, borderColor: accent | 제거 |

### 새 ColorScheme 토큰

```typescript
// types.ts에 추가
primarySoftStrong: string;   // mastery 배지 배경 (primarySoft보다 한 단계 진함)
cardShadowFront: string;     // 앞면 shadow 색상 (= primary)
cardShadowBack: string;      // 뒷면 shadow 색상 (= accent)
```

### 4개 팔레트 토큰 값

**쿨 모던:**
| 토큰 | 값 |
|------|-----|
| primarySoftStrong | `#E0E7FF` |
| cardShadowFront | `#6366F1` |
| cardShadowBack | `#F43F5E` |

**워밍 리프레시:**
| 토큰 | 값 |
|------|-----|
| primarySoftStrong | `#FDE68A` |
| cardShadowFront | `#D97706` |
| cardShadowBack | `#DC2626` |

**자연 프레시:**
| 토큰 | 값 |
|------|-----|
| primarySoftStrong | `#BBF7D0` |
| cardShadowFront | `#16A34A` |
| cardShadowBack | `#F97316` |

**뉴트럴 클린:**
| 토큰 | 값 |
|------|-----|
| primarySoftStrong | `#BFDBFE` |
| cardShadowFront | `#2563EB` |
| cardShadowBack | `#F59E0B` |

## 2. Screen 배경 정리

### 제거 대상

`Screen.tsx`에서 다음을 완전히 제거한다:

- `<View style={[styles.backgroundOrbA, ...]} />`
- `<View style={[styles.backgroundOrbB, ...]} />`
- `styles.backgroundOrbA` 스타일 정의
- `styles.backgroundOrbB` 스타일 정의

### 유지 대상

- `primaryGlow`, `accentGlow`, `neutralGlow` 토큰은 유지한다 — SwipeStudyCard의 glow 효과에서 사용 중
- `canvas` 단색 배경은 유지

## Files Changed

### 수정
- `src/shared/theme/palettes/types.ts` — 3개 토큰 추가
- `src/shared/theme/palettes/cool-modern.ts` — 3개 값 추가
- `src/shared/theme/palettes/warm-refresh.ts` — 3개 값 추가
- `src/shared/theme/palettes/nature-fresh.ts` — 3개 값 추가
- `src/shared/theme/palettes/neutral-clean.ts` — 3개 값 추가
- `src/shared/ui/Screen.tsx` — orb View 2개 + styles 제거
- `src/features/study/components/StudyFlashcard.tsx` — shadow 적용, border 제거, 타이포 조정, 높이 조정

## Scope Boundary

이 스펙에 포함되지 않는 항목:
- SessionCompleteCard 디자인 변경
- StudyHeader 디자인 변경
- HomeScreen 등 다른 화면의 Panel/카드 디자인
- 다크모드 shadow 값
