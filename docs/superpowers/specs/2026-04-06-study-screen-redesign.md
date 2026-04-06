# Study Screen Redesign — Design Spec

## Goal

학습 화면(StudyScreen)을 scaffold 상태에서 제품 수준의 게이미피케이션 UI로 끌어올린다.

## Design Decisions

| 항목 | 결정 |
|------|------|
| 톤/무드 | 게이미피케이션 — 진행 바, 스트릭, 색상 코딩 피드백 |
| 평가 인터랙션 | 3방향 스와이프 전용 (← Again, ↑ Good, → Easy). 버튼 제거 |
| 카드 뒷면 | 뜻(meaning)만 크게 표시. 예문/노트/footer 텍스트 제거 |
| 세션 완료 | 축하 + 상세 통계 (트로피, 스트릭, 평가 분포, mastery 진행 바) |

## Screen Layout

### 1. Header (상단 영역)

현재 `Screen` 컴포넌트의 title/subtitle을 활용하되, subtitle은 제거하고 헤더 아래에 커스텀 진행 영역을 배치한다.

```
┌─────────────────────────────────┐
│ 기초 영단어              🔥 3일  │  ← 덱 제목 + 스트릭
│ ████████░░░░░░░░░░░░░░░░░░░░░░ │  ← 진행 바 (gradient: primary → #10B981)
│ 3 / 12              5 due  3 m │  ← 현재/전체 + due/mastered 카운터
└─────────────────────────────────┘
```

- 스트릭은 현재 데이터 모델에 없으므로, `useStudySession` 훅에서 세션 내 정보로 대체하거나 placeholder로 둔다. 스트릭 계산 로직은 이 스펙 범위 밖이다.
- `Screen` subtitle prop 사용 중단, 대신 `StudyHeader` 컴포넌트를 새로 만든다.

### 2. Card Front (앞면)

```
┌─────────────────────────────────┐
│ [Mastery 2]                     │  ← 좌상단 뱃지
│                                 │
│              TERM               │  ← 라벨 (uppercase, primary 색상)
│           ephemeral             │  ← 단어 (36px, 800 weight)
│           tap to flip           │  ← 힌트 텍스트 (muted)
│                                 │
└─────────────────────────────────┘
  ← Again   ↑ Good   Easy →        ← 스와이프 힌트 (카드 바깥)
```

- 기존 `Panel` + accent border 대신 깨끗한 카드 스타일: `surface` 배경, 1px `line` border, `radius.l`, 미묘한 shadow.
- Badge("Front"/"Back"), scaffold footer 텍스트 제거.
- 카드 최소 높이 240px (기존 360px에서 축소 — 진행 바가 추가되었으므로).

### 3. Card Back (뒷면)

```
┌─────────────────────────────────┐
│                                 │
│            MEANING              │  ← 라벨 (uppercase, accent 색상)
│       일시적인, 순간적인          │  ← 뜻 (34px, 800 weight)
│                                 │
└─────────────────────────────────┘  ← accent 2px border로 앞/뒤 구분
```

- 앞면과 동일 레이아웃이지만 border가 `accent` 2px로 변경.
- mastery 뱃지는 뒷면에서 제거 (앞면에서만 노출).
- 뜻만 표시. example, note, footer는 뒷면에서 렌더링하지 않는다.

### 4. Swipe Interaction (3방향 스와이프)

현재 `SwipeStudyCard`는 좌/우(X축)만 지원한다. Y축(위)을 추가한다.

| 방향 | 평가 | 글로우 색상 | 칩 라벨 | 칩 배경 |
|------|------|------------|---------|---------|
| ← 좌 | Again (1) | `rgba(234,88,12,0.1)` | "Again" | `accentSoft` |
| ↑ 위 | Good (2) | `rgba(20,51,45,0.08)` | "Good" | `surface` + `line` border |
| → 우 | Easy (3) | `rgba(15,118,110,0.1)` | "Easy" | `primarySoft` |

**제스처 변경사항:**
- 기존 `failOffsetY([-18, 18])` 제거 — Y축을 제스처 실패 조건에서 해제해야 위 스와이프가 동작한다.
- `Gesture.Pan()`에 Y축 감지 추가: `activeOffsetX([-12, 12])` 유지, `activeOffsetY([-12])` 추가 (위 방향만).
- 아래 방향 스와이프는 무시 (스크롤 충돌 방지).
- 방향 판정: `|translationY|` > `|translationX|` 이고 `translationY < -threshold` → Good. 그 외는 기존 X축 로직 유지.
- 위 방향 exit: `translateY`를 `-(screen height * 0.8)`로 애니메이션.
- 위 방향 칩: 카드 상단 중앙에 표시.
- threshold: 기존 `SWIPE_THRESHOLD`(112px) 동일 적용.

### 5. Session Complete (세션 완료)

```
┌─────────────────────────────────┐
│  background: gradient           │
│  (primarySoft → surface)        │
│                                 │
│              🏆                 │
│         세션 완료!               │
│     🔥 3일 연속 · 12장 완료      │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │  3   │ │  5   │ │  4   │    │
│  │AGAIN │ │ GOOD │ │ EASY │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│  MASTERY ░░░░░░░████████ 67%   │
│                                 │
│      [ 다시 학습하기 ]           │
└─────────────────────────────────┘
```

- `useStudySession`에서 세션 중 rating 분포(again/good/easy 카운트)를 추적하도록 확장.
- mastery %는 `snapshot.masteredCount / cards.length * 100`으로 계산.
- `AppButton` → pill 스타일 (borderRadius: pill).

## Files Changed

### 삭제
- `src/features/study/components/StudyRatingBar.tsx` — 버튼 평가 UI 제거

### 신규
- `src/features/study/components/StudyHeader.tsx` — 진행 바 + 스트릭 + 카운터
- `src/features/study/components/SessionCompleteCard.tsx` — 완료 화면

### 수정
- `src/shared/animation/SwipeStudyCard.tsx` — 3방향 스와이프 (Y축 추가)
- `src/features/study/components/StudyFlashcard.tsx` — 카드 앞/뒷면 레이아웃 변경, StudyCardFace 단순화
- `src/features/study/screens/StudyScreen.tsx` — 헤더/완료 화면 교체, Rating Panel 제거, 레이아웃 정리
- `src/features/study/hooks/useStudySession.ts` — rating 분포 추적 (againCount, goodCount, easyCount)

### 변경 없음
- `src/shared/animation/AnimatedFlipCard.tsx` — 플립 로직은 그대로
- `src/shared/theme/tokens.ts` — 기존 토큰으로 충분
- `src/shared/ui/*` — 공유 UI 프리미티브는 변경 불필요

## Scope Boundary

이 스펙에 포함되지 않는 항목:
- 스트릭 계산 로직 (review_logs 기반 연속 학습일 계산). UI에 자리는 마련하되 하드코딩 placeholder 사용.
- 디자인 시스템 전체 확립 (토큰 확장, 타이포 스케일 등). 학습 화면에 필요한 스타일만 적용.
- 다른 화면(Home, MyDecks 등)의 리디자인.
- 사운드/햅틱 피드백.
