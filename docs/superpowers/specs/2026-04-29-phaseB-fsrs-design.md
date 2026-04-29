# Phase B — FSRS 알고리즘 추가 설계

작성일: 2026-04-29
상태: 설계 승인 대기
선행 단계: Phase A (SRS 알고리즘 선택 — Leitner + SM-2)

## 배경

Phase A에서 `SrsAlgorithm` 추상화를 만들고 Leitner / SM-2 두 알고리즘을 구현했습니다. Phase B는 그 위에 **FSRS-4.5** 알고리즘을 추가합니다 — Anki 23.10에 공식 통합된 망각곡선 기반의 차세대 알고리즘.

## 목표 / 비목표

### 목표
- `ts-fsrs` 라이브러리로 FSRS-4.5 알고리즘 어댑터 1개 추가
- 설정 화면 picker에 옵션 1개 추가 (Simple / Standard / **Advanced**)
- Default 17 파라미터로 동작 (사용자별 fit 미도입)
- 4 locale i18n 키 추가
- Phase A 추상화 그대로 활용 — 코드/스키마 변경 최소

### 비목표 (Phase B 범위 외)
- 사용자별 파라미터 fit (default만)
- desired retention 사용자 조정 UI (90% 고정)
- FSRS-5 / FSRS-6 옵션
- Pro 게이팅 (모두 무료, 미래 종합 결정)
- 학습 단계 시각화 (New/Learning/Review/Relearning UI)
- 카드별 알고리즘 override
- 알고리즘 효율 비교 통계

## 핵심 결정사항

| 결정 | 채택안 |
|---|---|
| 구현 방식 | **`ts-fsrs` 라이브러리** (자체 구현 아님) |
| 버전 | **FSRS-4.5** (Anki 23.10 표준) |
| 파라미터 | **Default 17개** (사용자별 fit 미도입) |
| Desired retention | **90%** 고정 |
| Pro 게이팅 | **없음** (Phase A와 동일 정책) |

## 아키텍처

### Phase A 추상화 활용

기존 `SrsAlgorithm` 인터페이스가 그대로 동작. 이번 Phase는:

1. `SrsAlgorithmId` 타입 확장: `"leitner" | "sm2"` → `"leitner" | "sm2" | "fsrs"`
2. `FsrsAlgorithm` 클래스 추가 (`ts-fsrs` 어댑터)
3. `srsAlgorithmRegistry`에 `fsrs` 항목 추가
4. `SrsAlgorithmPicker`에 옵션 1개 추가
5. i18n 키 4 locale에 `srs.algorithm.fsrs.*` 추가
6. `SrsPreferenceService` fallback 검증에 `"fsrs"` 추가

### 신규/변경 파일

```
새 파일:
src/core/services/srs/FsrsAlgorithm.ts
__tests__/services/srs/FsrsAlgorithm.test.ts
package.json (ts-fsrs 의존성)

변경 파일:
src/core/services/srs/SrsAlgorithm.ts (SrsAlgorithmId 타입)
src/core/services/srs/srsAlgorithmRegistry.ts (fsrs 항목)
src/core/services/srs/SrsPreferenceService.ts (fallback 검증)
src/features/settings/components/SrsAlgorithmPicker.tsx (옵션 1개)
src/shared/i18n/locales/{ko,en,ja,zh}.json (srs.algorithm.fsrs.*)
__tests__/services/srs/SrsPreferenceService.test.ts (fsrs valid 케이스 1개)
```

### 어댑터 책임

`FsrsAlgorithm`은 ts-fsrs 라이브러리의 `FSRS.next()`를 호출해서 우리 도메인 모델과 ts-fsrs Card 객체 사이 변환만 담당.

## 데이터 모델

### SQLite 변경 없음

Phase A의 `local_user_card_states.algorithm_data TEXT` 컬럼 그대로 재사용. 마이그레이션 불필요.

### `algorithmData` 구조 (FSRS용)

```ts
type FsrsData = {
  due: string;           // 다음 review 시각 (ISO8601)
  stability: number;     // 안정성 (얼마나 오래 기억할 수 있는가)
  difficulty: number;    // 난이도 (0-10 스케일)
  elapsedDays: number;   // 직전 review 후 경과 일수
  scheduledDays: number; // 예정된 다음 interval
  reps: number;          // 누적 review 수
  lapses: number;        // 누적 실수 수
  state: 0 | 1 | 2 | 3;  // New / Learning / Review / Relearning
  lastReview: string | null;
};
```

이 9 필드를 `algorithm_data` JSON에 직렬화. `ts-fsrs`의 `Card` 객체 필드는 snake_case (`elapsed_days`, `scheduled_days`, `last_review`) — 어댑터에서 camelCase로 변환.

### 시드 (algorithmData가 빈 경우)

신규 카드든 다른 알고리즘에서 전환된 카드든 동일:
- 빈 `algorithmData = {}` 또는 다른 알고리즘 잔존 데이터 → `ts-fsrs.createEmptyCard()`로 시작
- 첫 review에서 자연스럽게 채움

### `mastery_level` 동기화

```ts
function masteryFromFsrs(card: Card): number {
  // state === 0 (New) → 0
  // state === 1 (Learning) or 3 (Relearning) → 1
  // state === 2 (Review):
  //   reps 1-2 → 2
  //   reps 3-4 → 3
  //   reps 5+  → 4
}
```

홈 화면의 `mastery_level >= 3` 같은 조건이 모든 알고리즘에서 동일하게 동작.

### `easeFactor` 컬럼 처리

기존 `easeFactor` 컬럼은 SM-2 전용이었지만 모든 알고리즘이 공유하는 표준 출력. FSRS에서는 `difficulty` 값을 이 자리에 저장 (UI는 `easeFactor`를 직접 노출 안 함).

## 어댑터 구현 (개요)

```ts
// src/core/services/srs/FsrsAlgorithm.ts
import { FSRS, generatorParameters, createEmptyCard, Card } from "ts-fsrs";

const RATING_TO_FSRS: Record<ReviewRating, number> = {
  again: 1, hard: 2, good: 3, easy: 4,
};

export class FsrsAlgorithm implements SrsAlgorithm {
  readonly id = "fsrs" as const;
  private readonly engine = new FSRS(generatorParameters({ enable_fuzz: true }));

  computeNextState(prev: CardSrsState, input: ReviewInput): CardSrsState {
    const card = toFsrsCard(prev.algorithmData);
    const reviewedAt = new Date(input.reviewedAt);
    const result = this.engine.next(card, reviewedAt, RATING_TO_FSRS[input.rating]);
    const nextCard = result.card;

    return {
      masteryLevel: masteryFromFsrs(nextCard),
      easeFactor: nextCard.difficulty,
      intervalDays: nextCard.scheduled_days,
      nextReviewAt: nextCard.due.toISOString(),
      lastReviewedAt: input.reviewedAt,
      algorithmData: fromFsrsCard(nextCard),
    };
  }
}
```

helper `toFsrsCard` / `fromFsrsCard` / `masteryFromFsrs`는 같은 파일에 private 함수로.

### Preview 결정론

`ReviewRatingButtons`가 4번 호출하는 preview는 같은 timestamp(`now`)로 호출되므로 fuzz가 켜져 있어도 동일 결과 산출. 별도 처리 불필요.

## UI

### SrsAlgorithmPicker 옵션 추가

```
○ Simple (Leitner)
  5상자 시스템으로 직관적이고 빠름.

○ Standard (SM-2)
  Anki와 같은 표준. 카드별 난이도를 자동 조정.

○ Advanced (FSRS)              ← 신규
  망각곡선 기반의 차세대 알고리즘. Anki 23.10 도입.
```

코드 변경:
- `OPTIONS: SrsAlgorithmId[] = ["leitner", "sm2", "fsrs"]`
- `TITLE_KEYS` / `DESC_KEYS`에 `fsrs` 항목 추가

### i18n 키 (4 locale)

각 locale의 `srs.algorithm` 객체에 추가:

```json
"fsrs": {
  "title": "Advanced (FSRS)",
  "description": "<locale별 번역>"
}
```

ko: `"망각곡선 기반의 차세대 알고리즘. Anki 23.10에 도입됨."`
en: `"Forgetting-curve based next-gen algorithm. Adopted in Anki 23.10."`
ja: `"忘却曲線に基づく次世代アルゴリズム。Anki 23.10で採用。"`
zh: `"基于遗忘曲线的下一代算法。Anki 23.10 采纳。"`

### 학습 화면 영향

`ReviewRatingButtons`의 4버튼 + 다음 간격 preview는 자동으로 동작:
- 사용자가 FSRS 선택 → `useQuery(["srs", "algorithm"])` invalidate → 새 알고리즘으로 preview
- 4버튼 라벨/색상 동일

예상 preview:
```
다시      어려움    알맞음    쉬움
<1d       2d        7d        18d   ← FSRS의 stability/difficulty 기반
```

## 분석 이벤트

기존 `srs_algorithm_changed`, `srs_review_recorded` 이벤트가 그대로 동작 — `from`/`to`/`algorithmId` 값에 `"fsrs"` 추가될 뿐. 등록 변경 불필요.

## 테스트 전략

기존 패턴 준수: 수동 mock, no `jest.mock()` for service tests.

### `FsrsAlgorithm.test.ts` — 어댑터 정확성 (7 케이스)

라이브러리 알고리즘 자체는 ts-fsrs 책임이므로, **어댑터 변환만** 검증:

1. 빈 `algorithmData` + good → 결과에 `due/stability/difficulty/state/reps` 채워짐
2. `again` rating → `lapses` 증가
3. `algorithmData` round-trip (toFsrsCard → fromFsrsCard) 데이터 보존
4. `state === 0` (New) → `masteryLevel = 0`
5. `state === 2 + reps >= 5` → `masteryLevel = 4`
6. non-`again` rating → `nextReviewAt` 미래
7. `intervalDays === scheduledDays`

### `SrsPreferenceService.test.ts` 확장

기존 3 테스트에 1 추가:
- 저장된 값이 `"fsrs"` → `getAlgorithmAsync()` 가 `"fsrs"` 반환

### 통합 테스트 생략

알고리즘 선택 흐름은 Phase A에서 이미 검증됨. 새 알고리즘 추가는 registry 한 줄로 자동 포함되어 별도 통합 테스트 불필요.

### 수동 검증

1. 새 카드를 FSRS로 학습 → "good" → 다음 review 약 1~3일 후
2. 같은 카드 "good" 반복 → 간격 점점 길어짐 (지수형)
3. 중간 "again" → Relearning 상태 → 짧은 간격 재시작
4. SQLite 직접 조회: `algorithm_data` 컬럼에 `state`/`stability`/`difficulty` 값 존재

## 마이그레이션 시나리오

### 신규 사용자
- FSRS 첫 선택 → `algorithmData = {}` → 첫 review에서 채움. 매끄러움.

### 다른 알고리즘에서 FSRS 전환
- Leitner → FSRS: 잔존 `{ box }` 무시, 빈 카드처럼 시작
- SM-2 → FSRS: 잔존 `{ repetitions, lapses }` 무시, 빈 카드처럼 시작

### FSRS에서 다른 알고리즘으로 전환
- FSRS → Leitner: 잔존 `{ due, stability, ... }` 무시, Leitner가 `mastery_level`로 시드
- FSRS → SM-2: 잔존 무시, SM-2가 `repetitions=0`부터

기존 `mastery_level`/`interval_days` 컬럼은 모든 알고리즘이 공통 출력으로 갱신 — 통계 코드 호환.

## 외부 작업

**없음.** 순수 클라이언트 변경. `npm install ts-fsrs` 외 추가 작업 불필요.

## 성공 기준 (Done)

1. ✅ `npm run typecheck`, `npm run lint`, `npm test` 모두 통과
2. ✅ `ts-fsrs` 의존성 추가, `npm ls ts-fsrs` 정상 표시
3. ✅ `FsrsAlgorithm` 단위 테스트 7개 통과
4. ✅ 설정 화면에 3 옵션 표시 (Leitner / SM-2 / Advanced FSRS)
5. ✅ FSRS 선택 후 학습 화면 진입 시 4버튼 + 다음 간격 preview 표시
6. ✅ Phase A 알고리즘 (Leitner, SM-2) 영향 없음 — 기존 테스트 그대로 통과
7. ✅ 알고리즘 전환 시 첫 review 에러 없이 동작

## 분량 추정

작업 수 약 10개. Phase A의 절반. 외부 작업 없음.

## 후속 단계

- **Phase B+** (선택): 사용자별 파라미터 fit (Pro 게이팅 후보)
- **FSRS-5 / FSRS-6 옵션** (선택): 학습 데이터 충분히 쌓인 후
- **알고리즘 효율 비교 화면** (운영 데이터 기반)
- **Phase 4**: 구독 인프라
- **Phase 1.5**: 환불 RTDN webhook
- **Phase 2b**: 유료 콘텐츠 서버 분리 + Storage
