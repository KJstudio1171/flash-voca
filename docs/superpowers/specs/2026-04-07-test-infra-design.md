# Test Infrastructure Design

## Problem Definition

Flash Voca에 테스트 러너가 없어서 비즈니스 로직 변경 시 회귀 버그를 잡을 수 없다. Jest 기반 테스트 인프라를 구축하고, 가장 로직이 집중된 `StudySessionService`의 단위 테스트를 작성하여 테스트 패턴을 확립한다.

## Decisions

| 결정 | 선택 | 이유 |
|------|------|------|
| 테스트 레이어 | 서비스 단위 테스트 | DI 구조가 잘 되어 있어 mock 기반 검증에 적합. ROI 최고 |
| 러너 | Jest + jest-expo | Expo 공식 지원. RN 트랜스폼/모듈 리졸버 자동 설정 |
| 우선 대상 | `StudySessionService` | due 계산, mastery 판정 등 비즈니스 로직 집중 |
| Mock 방식 | 수동 인터페이스 구현 | 타입 안전, path alias 충돌 없음, 의도 명시적 |
| 데이터 생성 | 팩토리 함수 | 모델 필드가 많아 인라인은 가독성 저하 |

## Architecture

### Package Dependencies

- `jest-expo` (devDependency) — Expo 공식 Jest 프리셋
- `@types/jest` (devDependency) — Jest 타입 지원

### Jest Configuration

루트에 `jest.config.ts` 생성:

- `preset`: `jest-expo/ios` (순수 서비스 로직이므로 플랫폼 무관하나 프리셋은 하나 지정 필요)
- `moduleNameMapper`: `@/*` → `<rootDir>/*` (tsconfig path alias 매칭)
- `testMatch`: `**/__tests__/**/*.test.ts`

### Directory Structure

```
__tests__/
  helpers/
    factories.ts          # mock 데이터 팩토리 함수
    mockRepositories.ts   # mock 레포지토리 생성 헬퍼
  services/
    StudySessionService.test.ts
```

소스 구조를 미러링하여 `services/`, 향후 `repositories/` 등으로 확장 가능.

### npm Scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch"
}
```

## Factory Functions (`__tests__/helpers/factories.ts`)

모델별로 합리적 기본값을 가진 팩토리 함수 제공. 테스트에서 중요한 필드만 오버라이드:

```ts
createMockDeck(overrides?)        // → Deck
createMockDeckCard(overrides?)    // → DeckCard
createMockDeckDetail(overrides?)  // → DeckDetail
createMockCardState(overrides?)   // → UserCardState
createMockLogReviewInput(overrides?) // → LogReviewInput
```

사용 예:

```ts
createMockDeck({ id: "d1", cardCount: 5 })
createMockCardState({ masteryLevel: 3, nextReviewAt: "2026-04-10T00:00:00Z" })
```

대상: `StudySessionService` 테스트에 필요한 모델만. 추가 서비스 테스트 시 팩토리 확장.

## Mock Repositories (`__tests__/helpers/mockRepositories.ts`)

인터페이스 기반 mock 생성 헬퍼:

```ts
createMockDeckRepository(overrides?)   // → DeckRepository (모든 메서드 jest.fn())
createMockStudyRepository(overrides?)  // → StudyRepository (모든 메서드 jest.fn())
```

테스트별로 필요한 메서드만 오버라이드:

```ts
const deckRepo = createMockDeckRepository({
  listDecksAsync: jest.fn().mockResolvedValue([createMockDeck()]),
});
const service = new StudySessionService(deckRepo, studyRepo);
```

## Test Cases: StudySessionService

### `listDeckSummariesAsync` (5 cases)

1. 덱이 없으면 빈 배열 반환
2. 카드 상태가 없는 덱 → 전체 cardCount가 due
3. `nextReviewAt`이 미래인 카드는 due에서 제외
4. `masteryLevel >= 3`인 카드는 mastered로 집계
5. 여러 덱의 독립 집계 검증

### `getSnapshotAsync` (4 cases)

1. 존재하지 않는 deckId → `null` 반환
2. 카드별 state 매핑 — state가 있는 카드와 없는 카드
3. dueCount 정확성 (nextReviewAt 기준)
4. masteredCount 정확성 (masteryLevel 기준)

### `recordReviewAsync` (1 case)

1. `studyRepository.logReviewAsync`에 올바른 인자(input, userId)가 전달되는지 확인

총 10개 테스트 케이스.

## CLAUDE.md Updates

### Commands 섹션에 추가

```bash
npm test              # jest 전체 실행
npm run test:watch    # watch 모드
npx jest path/to/test # 단일 파일 실행
```

### 컨벤션 추가

- 테스트 파일: `__tests__/` 하위, 소스 구조 미러링
- mock 데이터: `__tests__/helpers/factories.ts` 팩토리 함수 사용
- mock 레포지토리: `__tests__/helpers/mockRepositories.ts` 사용
- 서비스 테스트: 인터페이스 기반 수동 mock, `jest.mock()` 사용 금지

### Verification checklist

기존 `npm run typecheck` + `npm run lint`에 `npm test` 추가.

## Scope Boundaries

### 포함

- Jest + jest-expo 설치 및 설정
- 팩토리 함수 (StudySessionService에 필요한 모델)
- Mock 레포지토리 헬퍼 (DeckRepository, StudyRepository)
- `StudySessionService` 단위 테스트 10개
- CLAUDE.md 업데이트

### 제외

- SQLite 통합 테스트
- UI 컴포넌트 테스트 (React Native Testing Library)
- CI/CD 연동
- 다른 서비스 테스트 (`DeckService`, `EntitlementService` 등)
- 커스텀 Jest matcher
