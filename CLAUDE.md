# 모아 · 저금 기록 앱

개인용 저금 목표 앱. GitHub Pages(`https://shugaeng.github.io/memo/`)로 배포되는 단일 파일 PWA.

## 작업 방식 (사용자 지정 규칙)

- **요청을 받으면 먼저 의견과 진행 계획을 제시하고, 사용자가 진행하라고 답한 뒤에 실행한다.**
  - 더 나은 대안, 부작용, 기존 기능과의 충돌이 있으면 이때 말한다.
  - 사용자가 **"바로 해"**라고 하면 의견은 한두 줄로 짧게 말하고 바로 진행한다.
- 답변은 한국어로, 사용자가 화면에서 보게 될 변화 중심으로 설명한다.

## 수정할 때 지킬 것

- **버전을 올린다.** `index.html`의 `APP_VERSION`과 `service-worker.js`의 `CACHE_NAME`(`moa-cache-v{버전}`)을 같은 값으로 맞춘다. 버전은 홈 화면 날짜 옆에 표시된다.
- **가계부 데이터는 읽기만 한다.** 가계부(`shugaeng/gagyebu`)의 Firestore 문서 `couples_budgets/{코드}`는 `get()`으로만 읽는다. 쓰기는 이 앱 전용 컬렉션 `moa_savings/{동기화코드}`에만 한다.
- **올리기 전에 확인한다.** Playwright(Chromium)로 휴대폰 화면 크기에서 다크·라이트 모드를 띄워 콘솔 오류가 없는지, 바뀐 화면이 의도대로 나오는지 본다. 폰트 CDN 로드 실패는 테스트 환경 네트워크 제한이라 무시해도 된다.
- 커밋 후 `main`에 push하면 바로 배포된다.

## 구조

- `index.html` — 화면, 스타일, 로직 전부. 외부 의존성은 Pretendard 폰트와 (연동 시에만) Firebase compat SDK.
- `service-worker.js` — 오프라인 캐시. Firestore 요청은 캐시하지 않는다.
- `manifest.json`, `icon-*.png` — PWA 설치용.

## 데이터 모델 (localStorage `moa_data_v1`, 클라우드 동기화 시 같은 내용)

- `settings`: `monthlyTarget`, `linkCode`(가계부 코드), `linkMode`(`accounts` | `net` | `off`)
- `months['YYYY-MM']`: `{ saved?, target? }` — 직접 입력값. 있으면 자동 계산보다 우선
- `accounts[]`: `{ id, name, kind, color(1~8), rate?, maturity?, memo, txs[] }`
  - `txs[]`: `{ id, ts, date, type: 'in'|'out'|'set', amount, memo, transferId?, peer?, carry? }`
- `goals[]`: `{ id, name, emoji, target, deadline, deposits[], accountIds[], manual }`
  - 기본은 전체 계좌 잔액(`goalIsAll`), `accountIds`로 특정 계좌, `manual`이면 직접 납입
- `journal[]`: 반성 일기(`kind: 'reflection'`, `ym`)와 메모(`kind: 'memo'`)

## 핵심 계산 규칙

- **월 저금액(계좌 기준)** = 그달 계좌 기록들이 만든 잔액 변화의 합 (`acctGrowth`, `accountsSaved`)
  - 입금 +, 출금 −, 잔액 수정은 바뀐 만큼 반영, 계좌끼리 이체는 상쇄
  - **이월 기록은 제외**: `carry: true`이거나, 표시가 없을 때 계좌의 첫 '잔액' 기록(등록 시 시작 잔액)
- 우선순위: 직접 입력 > 계좌 기준 > 가계부(수입 − 지출). 가계부 연동이 없으면 계좌 기준
- 그래프는 기록이 시작되기 전 달을 0이 아니라 '기록 없음'(null)으로 처리한다
