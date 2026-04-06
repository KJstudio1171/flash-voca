# Integrated Color System — Design Spec

## Goal

정적 색상 토큰을 동적 팔레트 전환 시스템으로 교체한다. 사용자가 4개 팔레트 중 하나를 선택하면 앱 전체 색상이 변경된다. 하드코딩된 rgba/hex 값을 모두 시맨틱 토큰으로 흡수한다.

## Design Decisions

| 항목 | 결정 |
|------|------|
| 팔레트 수 | 4개: 쿨 모던, 워밍 리프레시, 자연 프레시, 뉴트럴 클린 |
| 기본 팔레트 | 쿨 모던 |
| 전환 범위 | 풀 세트 교체 (배경, 텍스트, 프라이머리, 액센트 등 전부) |
| 저장 | SQLite `app_meta` 테이블에 팔레트 ID 저장 |
| UI | 설정 전용 화면 신규 생성 |
| 다크모드 | 이 스펙 범위 밖. 구조는 확장 가능하게 설계 |

## Architecture

### Layer 구조

```
Palette files (primitive)
  → ColorScheme type (semantic interface)
    → ThemeProvider + useTheme() (delivery)
      → createStyles(colors) (consumption)
```

### ColorScheme 타입

현재 `tokens.colors`의 11개 키를 유지하고, 하드코딩 제거를 위한 토큰을 추가한다:

```typescript
type ColorScheme = {
  // 기존 시맨틱 (유지)
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

  // 신규 — 하드코딩 제거용
  onPrimary: string;       // primary 버튼 위 텍스트 (AppButton)
  overlayWhite: string;    // 반투명 흰색 배경 (SessionCompleteCard)
  primaryGlow: string;     // primary rgba 글로우 (SwipeStudyCard, Screen orb)
  accentGlow: string;      // accent rgba 글로우 (SwipeStudyCard, Screen orb)
  neutralGlow: string;     // neutral rgba 글로우 (SwipeStudyCard up direction)
  chipAgainBg: string;     // Again 칩 배경 (= accentSoft)
  chipAgainBorder: string; // Again 칩 보더
  chipEasyBg: string;      // Easy 칩 배경 (= primarySoft)
  chipEasyBorder: string;  // Easy 칩 보더
};
```

### 4개 팔레트 정의

**쿨 모던 (cool-modern)** — 기본:

| 토큰 | 값 |
|------|-----|
| canvas | `#F8FAFC` |
| surface | `#FFFFFF` |
| surfaceStrong | `#FFFFFF` |
| ink | `#0F172A` |
| muted | `#64748B` |
| primary | `#6366F1` |
| primarySoft | `#EEF2FF` |
| accent | `#F43F5E` |
| accentSoft | `#FFF1F2` |
| info | `#0EA5E9` |
| infoSoft | `#E0F2FE` |
| line | `#E2E8F0` |
| onPrimary | `#FFFFFF` |
| overlayWhite | `rgba(255,255,255,0.7)` |
| primaryGlow | `rgba(99,102,241,0.1)` |
| accentGlow | `rgba(244,63,94,0.1)` |
| neutralGlow | `rgba(15,23,42,0.08)` |
| chipAgainBg | `#FFF1F2` |
| chipAgainBorder | `rgba(244,63,94,0.2)` |
| chipEasyBg | `#EEF2FF` |
| chipEasyBorder | `rgba(99,102,241,0.2)` |

**워밍 리프레시 (warm-refresh)**:

| 토큰 | 값 |
|------|-----|
| canvas | `#FFFBF5` |
| surface | `#FFFFFF` |
| surfaceStrong | `#FFFFFF` |
| ink | `#1C1917` |
| muted | `#78716C` |
| primary | `#D97706` |
| primarySoft | `#FEF3C7` |
| accent | `#DC2626` |
| accentSoft | `#FEE2E2` |
| info | `#2563EB` |
| infoSoft | `#DBEAFE` |
| line | `#E7E5E4` |
| onPrimary | `#FFFFFF` |
| overlayWhite | `rgba(255,255,255,0.7)` |
| primaryGlow | `rgba(217,119,6,0.1)` |
| accentGlow | `rgba(220,38,38,0.1)` |
| neutralGlow | `rgba(28,25,23,0.08)` |
| chipAgainBg | `#FEE2E2` |
| chipAgainBorder | `rgba(220,38,38,0.2)` |
| chipEasyBg | `#FEF3C7` |
| chipEasyBorder | `rgba(217,119,6,0.2)` |

**자연 프레시 (nature-fresh)**:

| 토큰 | 값 |
|------|-----|
| canvas | `#F0FDF4` |
| surface | `#FFFFFF` |
| surfaceStrong | `#FFFFFF` |
| ink | `#14532D` |
| muted | `#4B5563` |
| primary | `#16A34A` |
| primarySoft | `#DCFCE7` |
| accent | `#F97316` |
| accentSoft | `#FFEDD5` |
| info | `#0284C7` |
| infoSoft | `#E0F2FE` |
| line | `#BBF7D0` |
| onPrimary | `#FFFFFF` |
| overlayWhite | `rgba(255,255,255,0.7)` |
| primaryGlow | `rgba(22,163,74,0.1)` |
| accentGlow | `rgba(249,115,22,0.1)` |
| neutralGlow | `rgba(20,83,45,0.08)` |
| chipAgainBg | `#FFEDD5` |
| chipAgainBorder | `rgba(249,115,22,0.2)` |
| chipEasyBg | `#DCFCE7` |
| chipEasyBorder | `rgba(22,163,74,0.2)` |

**뉴트럴 클린 (neutral-clean)**:

| 토큰 | 값 |
|------|-----|
| canvas | `#FAFAFA` |
| surface | `#FFFFFF` |
| surfaceStrong | `#FFFFFF` |
| ink | `#171717` |
| muted | `#737373` |
| primary | `#2563EB` |
| primarySoft | `#DBEAFE` |
| accent | `#F59E0B` |
| accentSoft | `#FEF3C7` |
| info | `#6366F1` |
| infoSoft | `#EEF2FF` |
| line | `#E5E5E5` |
| onPrimary | `#FFFFFF` |
| overlayWhite | `rgba(255,255,255,0.7)` |
| primaryGlow | `rgba(37,99,235,0.1)` |
| accentGlow | `rgba(245,158,11,0.1)` |
| neutralGlow | `rgba(23,23,23,0.08)` |
| chipAgainBg | `#FEF3C7` |
| chipAgainBorder | `rgba(245,158,11,0.2)` |
| chipEasyBg | `#DBEAFE` |
| chipEasyBorder | `rgba(37,99,235,0.2)` |

## ThemeProvider

`AppProviders` 내부에 `ThemeProvider`를 추가한다. 기존 `AppServicesContext`와 동일한 패턴.

```
AppProviders
  └─ ThemeProvider          ← 새로 추가
       └─ AppServicesContext
            └─ QueryClientProvider
```

### 인터페이스

```typescript
type ThemeContextValue = {
  colors: ColorScheme;
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
};

type PaletteId = "cool-modern" | "warm-refresh" | "nature-fresh" | "neutral-clean";
```

### 저장/로드

- `app_meta` 테이블에 `key = "palette_id"`, `value = PaletteId`로 저장.
- `BootstrapService.initializeAsync()` 실행 시 `app_meta`에서 palette_id를 읽어 초기값 설정.
- palette_id가 없으면 `"cool-modern"`을 기본값으로 사용.
- `setPalette` 호출 시 `app_meta`에 즉시 저장 + 컨텍스트 상태 업데이트.

## Settings 화면

### 라우트

- `/settings` — 새 스택 화면 (`app/settings/index.tsx`)
- `app/(tabs)/profile/index.tsx`에서 "Settings" 버튼으로 진입

### UI 구성

- `Screen` 컴포넌트 사용 (title: "Settings")
- "COLOR PALETTE" 섹션 라벨
- 4개 팔레트 행: 색상 스와치 3개(primary, accent, canvas) + 이름 + 선택 시 primary border + 체크 표시
- 선택 즉시 `setPalette` 호출 → 화면 색상이 바로 바뀜

## 스타일 마이그레이션

### 패턴 변환

모든 화면/컴포넌트에서:

1. `import { tokens } from "@/src/shared/theme/tokens"` → `import { useTheme } from "@/src/shared/theme/ThemeProvider"`
2. 모듈 레벨 `const styles = StyleSheet.create({...})` → 함수 내부 `const styles = createStyles(colors)`
3. 하드코딩 rgba/hex → 시맨틱 토큰 사용

### tokens.ts 변환

`tokens` 객체에서 `colors` 키를 제거하고, `spacing`과 `radius`만 남긴다. 색상은 `useTheme().colors`에서만 접근한다.

```typescript
// tokens.ts (변경 후)
export const tokens = {
  spacing: { xs: 6, s: 12, m: 16, l: 20, xl: 28, xxl: 36 },
  radius: { s: 12, m: 18, l: 24, pill: 999 },
};
```

### 마이그레이션 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/shared/theme/tokens.ts` | colors 제거, spacing/radius만 유지 |
| `src/shared/ui/AppButton.tsx` | `#FFFFFF` → `colors.onPrimary` |
| `src/shared/ui/Badge.tsx` | 정적 tone 색상 → createStyles |
| `src/shared/ui/Panel.tsx` | 정적 색상 → createStyles |
| `src/shared/ui/Screen.tsx` | rgba orbs → `colors.primaryGlow`/`accentGlow` |
| `src/shared/ui/TextField.tsx` | 정적 색상 → createStyles |
| `src/shared/animation/SwipeStudyCard.tsx` | rgba 글로우/칩 → 시맨틱 토큰 |
| `src/features/study/components/StudyFlashcard.tsx` | 정적 색상 → createStyles |
| `src/features/study/components/StudyHeader.tsx` | 정적 색상 → createStyles |
| `src/features/study/components/SessionCompleteCard.tsx` | rgba → `colors.overlayWhite` |
| `src/features/study/screens/StudyScreen.tsx` | 정적 색상 → createStyles |
| `src/features/home/screens/HomeScreen.tsx` | 정적 색상 → createStyles |
| `src/features/decks/screens/MyDecksScreen.tsx` | 정적 색상 → createStyles |
| `src/features/decks/screens/DeckEditorScreen.tsx` | 정적 색상 → createStyles |
| `src/features/store/screens/StoreScreen.tsx` | 정적 색상 → createStyles |
| `src/features/store/screens/BundleDetailScreen.tsx` | 정적 색상 → createStyles |
| `src/features/profile/screens/ProfileScreen.tsx` | 정적 색상 → createStyles |
| `src/app/AppProviders.tsx` | ThemeProvider 감싸기 |
| `src/app/bootstrap/AppBootstrapGate.tsx` | 부트스트랩 시 palette_id 로드 |

## Files Changed

### 신규
- `src/shared/theme/palettes/cool-modern.ts`
- `src/shared/theme/palettes/warm-refresh.ts`
- `src/shared/theme/palettes/nature-fresh.ts`
- `src/shared/theme/palettes/neutral-clean.ts`
- `src/shared/theme/palettes/index.ts` — 팔레트 레지스트리, PaletteId/ColorScheme 타입 export
- `src/shared/theme/ThemeProvider.tsx` — ThemeContext + useTheme()
- `app/settings/index.tsx` — 설정 화면 (팔레트 선택 UI)

### 수정
- `src/shared/theme/tokens.ts` — colors 제거
- `src/app/AppProviders.tsx` — ThemeProvider 추가
- `src/app/bootstrap/AppBootstrapGate.tsx` — palette_id 로드 로직
- `app/_layout.tsx` — settings 스택 라우트 추가
- `app/(tabs)/profile/index.tsx` — Settings 버튼 추가
- 위 마이그레이션 대상 파일 전체 (15개 화면/컴포넌트)

## Scope Boundary

이 스펙에 포함되지 않는 항목:
- 다크모드. ColorScheme 구조가 확장 가능하므로 나중에 dark variant를 팔레트에 추가 가능.
- 사용자 커스텀 팔레트 생성.
- 팔레트 전환 애니메이션.
- seed 데이터의 accentColor/coverColor 값 변환 (이 값들은 개별 덱/번들의 고유 색상이므로 테마와 독립).
