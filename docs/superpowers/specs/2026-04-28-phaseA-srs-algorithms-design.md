# Phase A — SRS 알고리즘 선택 (Leitner + SM-2) 설계

작성일: 2026-04-28
상태: 설계 승인 대기
선행 단계: Phase 0 / Phase 1 / Phase 2 (독립적 — 어느 단계 후에도 적용 가능)

## 배경

flash-voca의 현재 SRS는 `SqliteStudyRepository.getNextReviewState`의 자체 알고리즘 — 사실상 단순 review scheduler. `mastery_level × 2`일 간격, 최대 8일, `ease_factor` 컬럼은 정의만 되어있고 실제 작동 안 함. 표준 SRS 대비 학습 효율이 떨어지고, 사용자가 알고리즘을 선택할 수 없음.

Phase A는 **사용자가 학습 알고리즘을 선택**할 수 있는 인프라를 만들고 **Leitner**와 **SM-2(Anki 표준)** 두 알고리즘을 지원합니다. FSRS는 별도 Phase B로 분리.

## 목표 / 비목표

### 목표
- 알고리즘 추상화 (`SrsAlgorithm` 인터페이스 + `algorithmData` 메타 컬럼)
- **Leitner** 구현 (5상자, 고정 주기)
- **SM-2** 구현 (Anki 표준, 동적 ease, 지수형 간격)
- 앱 전역 설정 (1개 키)
- 설정 화면 picker
- 학습 화면 4단계 응답 버튼 + 다음 간격 미리보기
- 기존 데이터 자연 흡수 (별도 마이그레이션 코드 없음)
- 기존 자체 알고리즘(`getNextReviewState`) 완전 제거

### 비목표 (Phase A 범위 외)
- **FSRS** (Phase B)
- 덱별 알고리즘 설정 (앱 전역만)
- 알고리즘 간 데이터 변환 (자연 흡수 패턴만)
- 알고리즘별 효율 비교 통계
- 학습 단계 분리 (learning/review/lapse)
- 카드별 알고리즘 override
- Pro 게이팅 (모두 무료, 미래 종합 결정)
- 응답 시간 정밀 추적 (Leitner/SM-2는 미사용)
- 자동 suspend (마스터 카드 보관)

## 핵심 결정사항

| 결정 | 채택안 |
|---|---|
| 지원 알고리즘 | **Leitner + SM-2** 2종 (자체 알고리즘 폐기, FSRS는 Phase B) |
| Phase 분할 | **Phase A** 추상화+Leitner+SM-2, **Phase B** FSRS |
| 설정 단위 | **앱 전역** 1개 |
| 변경 시 데이터 처리 | **자연 흡수** ("이 시점부터" 패턴) |
| Pro 게이팅 | **없음** (모두 무료) |
| 응답 등급 | 4단계 enum: `again | hard | good | easy` |
| 기본 알고리즘 | **Leitner** (현재 자체 알고리즘과 가장 유사) |

## 아키텍처

### 핵심 추상화 — `SrsAlgorithm` 인터페이스

```ts
// src/core/services/srs/SrsAlgorithm.ts
export type SrsAlgorithmId = "leitner" | "sm2";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewInput {
  rating: ReviewRating;
  reviewedAt: string;        // ISO8601
  elapsedMs: number;         // FSRS에서만 사용
}

export interface CardSrsState {
  masteryLevel: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  algorithmData: Record<string, unknown>;
}

export interface SrsAlgorithm {
  readonly id: SrsAlgorithmId;
  computeNextState(prev: CardSrsState, input: ReviewInput): CardSrsState;
}
```

**원칙:**
- `CardSrsState`는 모든 알고리즘이 공유하는 슈퍼셋
- `algorithmData`에 알고리즘별 메타 (Leitner의 `box`, SM-2의 `repetitions`/`lapses`)
- `computeNextState`는 순수 함수 — 결정론적, 테스트 trivial

### 신규 모듈

```
src/core/services/srs/
  ├─ SrsAlgorithm.ts              인터페이스 + 타입
  ├─ LeitnerAlgorithm.ts          Leitner 구현
  ├─ Sm2Algorithm.ts              SM-2 구현
  ├─ srsAlgorithmRegistry.ts      id → 인스턴스
  ├─ SrsPreferenceService.ts      앱 전역 설정 read/write
  └─ ratingCodec.ts               ReviewRating ↔ INTEGER

src/features/settings/components/
  └─ SrsAlgorithmPicker.tsx       라디오 카드 picker

src/features/study/components/
  └─ ReviewRatingButtons.tsx      4버튼 + 간격 preview

__tests__/services/srs/
  ├─ LeitnerAlgorithm.test.ts
  ├─ Sm2Algorithm.test.ts
  └─ SrsPreferenceService.test.ts
```

### 기존 코드 영향

- `SqliteStudyRepository.getNextReviewState` — **삭제**
- `SqliteStudyRepository.logReviewAsync` — `algorithm` 인자 받아 `algorithm.computeNextState` 호출
- `StudySessionService.recordReviewAsync` — preference 조회 후 알고리즘 선택, repository에 전달
- `StudyFlashcard` / `StudyScreen` — 응답 입력 UI를 `ReviewRatingButtons`로 교체
- `LogReviewInput.rating` 타입: `number` → `ReviewRating`

## 데이터 모델

### 로컬 SQLite 변경

#### 컬럼 추가

```sql
ALTER TABLE local_user_card_states
  ADD COLUMN algorithm_data TEXT NOT NULL DEFAULT '{}';
```

기존 컬럼 (`mastery_level`, `ease_factor`, `interval_days`, `next_review_at`, `last_reviewed_at`) 유지 — 모든 알고리즘이 공통으로 사용하는 표준 출력.

#### 런타임 마이그레이션

`src/core/database/initialize.ts` 의 schema_version bump (6 → 7) + `migrateToVersion7Async`:
```ts
await addColumnIfMissingAsync(
  db, "local_user_card_states", "algorithm_data", "TEXT NOT NULL DEFAULT '{}'"
);
```

### `app_meta` — 알고리즘 설정 저장

기존 `app_meta` 테이블 활용:
```
key   = "srs.algorithm"
value = "leitner" | "sm2"
```

키 없으면 코드 레벨 default = `"leitner"`.

### `local_review_logs.rating` 호환

기존 `INTEGER` 컬럼 유지. enum ↔ int 매핑은 `ratingCodec.ts` 한 곳에서:
- `again = 1`, `hard = 2`, `good = 3`, `easy = 4`
- 기존 데이터의 `rating = 0`은 `again`으로 해석

### 도메인 모델 변경 (`src/core/domain/models.ts`)

```ts
// UserCardState에 추가
algorithmData: Record<string, unknown>;

// LogReviewInput.rating 타입 변경
rating: ReviewRating;   // 기존: number
```

`ReviewRating`은 `models.ts` 또는 `srs/SrsAlgorithm.ts`에서 export.

## 알고리즘 본체

### Leitner — 5상자 시스템

#### 상자별 주기

| Box | 주기 |
|---|---|
| 1 | 1일 |
| 2 | 2일 |
| 3 | 4일 |
| 4 | 8일 |
| 5 | 14일 |

#### Box 이동 규칙

| Rating | 이동 |
|---|---|
| `again` | → 1 |
| `hard` | → max(1, current - 1) |
| `good` | → min(5, current + 1) |
| `easy` | → min(5, current + 2) |

#### 알고리즘 데이터

```ts
type LeitnerData = { box: 1 | 2 | 3 | 4 | 5 };
```

#### 시드 (algorithmData가 빈 경우)

기존 `mastery_level (0~4)` → `box (1~5)` 자연 매핑:
```ts
seedBox = max(1, min(5, masteryLevel + 1))
```

이로써 기존 사용자의 학습 진척도가 손실 없이 흡수됨.

#### `mastery_level` 동기화

`mastery = max(0, min(4, box - 1))` — 홈 화면 등 기존 통계 코드 호환.

### SM-2 — Anki 표준

#### 핵심 변수

- `repetitions` — 연속 정답 횟수 (`again` 시 0 리셋)
- `easeFactor` — 카드 난이도 계수 (default 2.5, min 1.3)
- `intervalDays` — 다음 복습까지 일수
- `lapses` — 누적 실수 (통계용, 옵션)

#### 응답에 따른 변화

| Rating | repetitions | interval | easeFactor |
|---|---|---|---|
| `again` | 0 | 1d | -0.20 (min 1.3) |
| `hard` | +1 | × 1.2 (또는 첫: 1d) | -0.15 (min 1.3) |
| `good` | +1 | first:1d / second:6d / else: × ease | 변화 없음 |
| `easy` | +1 | first:4d / second:6d / else: × ease × 1.3 | +0.15 |

#### 알고리즘 데이터

```ts
type Sm2Data = { repetitions: number; lapses: number };
```

#### 시드 (algorithmData가 빈 경우)

`repetitions = 0`, `lapses = 0`. `easeFactor`는 기존 컬럼 그대로 (없으면 2.5). `intervalDays`는 기존 값 유지 → 첫 SM-2 review에서 점진 조정.

#### `mastery_level` 동기화

`mastery = min(4, max(0, repetitions))`.

### 알고리즘 레지스트리

```ts
// src/core/services/srs/srsAlgorithmRegistry.ts
const REGISTRY: Record<SrsAlgorithmId, SrsAlgorithm> = {
  leitner: new LeitnerAlgorithm(),
  sm2: new Sm2Algorithm(),
};
export function getSrsAlgorithm(id: SrsAlgorithmId): SrsAlgorithm {
  return REGISTRY[id];
}
```

### `SrsPreferenceService`

```ts
const KEY = "srs.algorithm";
const DEFAULT: SrsAlgorithmId = "leitner";

class SrsPreferenceService {
  constructor(private appMeta: AppMetaStore) {}
  async getAlgorithmAsync(): Promise<SrsAlgorithmId> {
    const raw = await this.appMeta.getValueAsync(KEY);
    return raw === "leitner" || raw === "sm2" ? raw : DEFAULT;
  }
  async setAlgorithmAsync(id: SrsAlgorithmId): Promise<void> {
    await this.appMeta.setValueAsync(KEY, id);
  }
}
```

`AppMetaStore`는 Phase 2에서 만든 인터페이스 재사용.

## 흐름 변경

### `recordReviewAsync` (StudySessionService)

```
1. preferenceService.getAlgorithmAsync()        → SrsAlgorithmId
2. getSrsAlgorithm(id)                          → SrsAlgorithm 인스턴스
3. studyRepo.applyReviewAsync(input, algorithm)
     ├─ 카드의 현재 CardSrsState 조회
     ├─ algorithm.computeNextState(prev, input) → next
     ├─ local_user_card_states UPSERT
     └─ local_review_logs INSERT (ratingCodec로 INTEGER 변환)
```

### `algorithm_data` 직렬화

repository에서 `JSON.stringify(state.algorithmData)` 로 저장, 읽을 때 `JSON.parse`. 잘못된 JSON은 빈 객체로 fallback.

## UI

### 1. 설정 화면 — `SrsAlgorithmPicker`

라디오 카드 형태:

```
학습 알고리즘
─────────────
◉ Simple (Leitner)
  5상자 시스템으로 직관적이고 빠름.

○ Standard (SM-2)
  Anki와 같은 표준. 카드별 난이도를 자동 조정.
```

변경 즉시 저장 + 토스트 안내.

### 2. 학습 화면 — `ReviewRatingButtons`

하단 4버튼:

```
┌─────────┬─────────┬─────────┬─────────┐
│  다시    │  어려움  │  알맞음  │  쉬움    │
│  1d     │  1d     │  6d     │  14d    │
└─────────┴─────────┴─────────┴─────────┘
  빨강       주황       파랑       초록
```

각 버튼은 **다음 복습 예상 간격**을 미리 표시 (선택 알고리즘의 `computeNextState` 4번 호출하여 preview).

기존 swipe 제스처와의 병행 / 폐기는 구현 시점 결정.

### 3. 색상 매핑

| Rating | 색상 토큰 |
|---|---|
| `again` | danger (빨강) |
| `hard` | warning (주황) |
| `good` | primary (파랑) |
| `easy` | success (초록) |

토큰 부재 시 가까운 토큰으로 fallback (구현 시점에 `tokens.ts` 확인).

## i18n 키 (4 locale)

```
srs.algorithm.sectionTitle           "학습 알고리즘"
srs.algorithm.leitner.title          "Simple (Leitner)"
srs.algorithm.leitner.description    "5상자 시스템으로 직관적이고 빠름."
srs.algorithm.sm2.title              "Standard (SM-2)"
srs.algorithm.sm2.description        "Anki와 같은 표준. 카드별 난이도를 자동 조정."
srs.algorithm.changed                "{{name}}로 변경했어요."

srs.rating.again                     "다시"
srs.rating.hard                      "어려움"
srs.rating.good                      "알맞음"
srs.rating.easy                      "쉬움"
```

## 분석 이벤트

```ts
srs_algorithm_changed: { from: SrsAlgorithmId | null; to: SrsAlgorithmId }
srs_review_recorded:   { algorithmId: SrsAlgorithmId; rating: ReviewRating }
```

## 마이그레이션 시나리오

### 신규 사용자
- 알고리즘 키 없음 → default `leitner`
- 첫 학습에서 `algorithm_data = { box: 1 }` 자연 채움

### 기존 사용자 업데이트
- schema_version 6→7로 컬럼 추가, 기본값 `'{}'`
- 기본 알고리즘 = Leitner (현재 자체 알고리즘과 가장 유사)
- 첫 review에서 Leitner가 `mastery_level + 1`을 box로 시드 → 학습 진척도 보존

### Leitner → SM-2 전환
- 설정 변경 즉시 저장
- 다음 review에서 SM-2가 `repetitions=0`부터 시작
- `easeFactor`/`intervalDays` 기존 값 유지 → 1~2주 내 안정화

### 호환성

| 케이스 | mastery_level | interval_days | algorithm_data |
|---|---|---|---|
| 신규 + Leitner | 0 | 0 | `{}` → 알고리즘이 채움 |
| 기존 + Leitner | 보존 | 보존 | `{}` → mastery 시드 |
| 기존 + SM-2 | 보존 | 보존 | `{}` → repetitions=0 |
| 알고리즘 전환 | 보존 | 보존 | 잔존 데이터는 새 알고리즘이 무시 |

## 테스트 전략

기존 패턴 준수: 수동 mock, no `jest.mock()` for service tests.

### 알고리즘 단위 테스트

`__tests__/services/srs/LeitnerAlgorithm.test.ts` — 7~10 케이스:
- again → box 1, interval 1
- good 진급 (각 box별)
- easy 두 단계 점프
- hard 후퇴
- box 5 cap
- box 1 floor (hard from box 1)
- 빈 algorithmData + masteryLevel=2 → box=3 시드

`__tests__/services/srs/Sm2Algorithm.test.ts` — 7~10 케이스:
- 첫 학습 4 rating 별 interval (1/1/1/4)
- 두 번째 (rep=1) good → 6d
- 누적 (rep=N) good → prev × ease
- ease floor 1.3
- ease 증가 0.15 (easy)
- lapses 누적 (again)

### Service 통합 테스트

- `StudySessionService.test.ts` 확장 — 알고리즘 선택 흐름
- `SrsPreferenceService.test.ts` — get/set, default, 잘못된 값 fallback

### Repository 테스트

- algorithm_data JSON 직렬화/역직렬화
- 빈 algorithm_data 행 처리

### UI 테스트

- `ReviewRatingButtons` 4버튼, onRate 콜백 enum 정확
- `SrsAlgorithmPicker` 선택 표시, 변경 시 setAlgorithmAsync

### Mock helpers

- `__tests__/helpers/MockSrsPreferenceService.ts`
- `__tests__/helpers/createMockCardSrsState.ts`

## 성공 기준 (Done)

1. ✅ `npm run typecheck`, `npm run lint`, `npm test` 모두 통과
2. ✅ `algorithm_data` 컬럼 런타임 ALTER 성공 (기존 DB 호환)
3. ✅ 설정 화면에서 Leitner ↔ SM-2 즉시 전환
4. ✅ 학습 화면에 4버튼 + 간격 preview 표시
5. ✅ 두 알고리즘 단위 테스트 각 7~10 케이스 통과
6. ✅ 기존 데이터로 첫 review 에러 없이 동작
7. ✅ `getNextReviewState` 함수 완전 제거 (`grep` 0건)

## 외부 작업 체크리스트

**없음.** 순수 클라이언트 변경.

## 후속 단계

- **Phase B** (선택): FSRS 추가 — 17 파라미터 + ML fit
- **Phase 3**: SRS 동기화 (Phase 2 패턴 따라, `algorithm_data` 포함 sync)
- **알고리즘 효율 통계**: 운영 데이터 기반 retention rate 비교
