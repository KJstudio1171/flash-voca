# Observability Smoke Checklist

관측성 기반 구현 후 수동 검증. 벤더 붙일 때 회귀 테스트로 재활용.

## 준비
- Android 에뮬레이터 실행 (`npx expo run:android`)
- Metro 콘솔 열어두기

## 체크 항목

### 1. 개발 빌드 에러 캡처
- [ ] 앱 내 임의 위치에 `throw new Error("smoke 1")` 삽입 → 콘솔에 `ErrorReport` JSON 구조화 출력 확인
- [ ] `userMessage`, `observability.installId`, `observability.sessionId` 필드 포함 확인

### 2. Promise rejection
- [ ] 임의 버튼에 `Promise.reject(new Error("smoke 2"))` 연결 → 콘솔에 리포트 출력 확인
- [ ] 기존 RN dev 경고(Yellow/Red Box)도 여전히 표시됨

### 3. ErrorBoundary
- [ ] 자식 컴포넌트에서 `throw new Error("smoke 3")` → fallback UI 렌더
- [ ] 콘솔에 리포트 출력 확인

### 4. Install ID / Session ID
- [ ] 앱 종료 후 재실행 → `installId` 동일, `sessionId` 상이

### 5. 시드 분석 이벤트
- [ ] 앱 시작 시 `app_opened` 이벤트 로그 출력
- [ ] 새 덱 생성 → `deck_created` 이벤트 로그 (`cardCount`, `isCustom` props 포함)
- [ ] 덱 삭제 → `deck_deleted` 이벤트 로그 (`cardCount` props 포함)

> Note: `study_session_started`/`study_session_completed` 이벤트는 현재 아키텍처(세션 객체 없음, per-review 로깅만)와 맞지 않아 보류. 세션 개념 도입 시 재추가 예정.

### 6. 브레드크럼 첨부
- [ ] 덱 생성 후 즉시 throw → 에러 리포트의 `breadcrumbs`에 `deck_created` 포함 확인

### 7. PII 스크러빙 (수동 확인)
- [ ] AppError의 context에 `{ deckName: "테스트" }` 같은 미등록 키 넣어 throw → 리포트의 `context`에 `deckName` 없음 확인

### 8. 프로덕션 빌드 동의 게이트 (선택)
- [ ] 릴리스 빌드에서 에러 발생 → 동의 설정 전엔 sink 호출 안 됨
- [ ] DB의 `app_meta`에 `consent_error_reports=true` 수동 삽입 → 이후 발생 에러는 리포트됨
