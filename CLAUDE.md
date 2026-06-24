# note-lens 개발 룰 (CLAUDE.md)

> note-lens(구글드라이브 마크다운 시각화 도구, Vite + React 18 + TypeScript SPA)의 작업 규칙이다.
> autopost 프로젝트의 개발 방법론을 이 프로젝트(SPA)에 맞게 추려 자체 완결로 옮긴 것이다. 구글드라이브 원본·정션·Obsidian 의존 없음.
> AI·사람 작업자 공통으로 따른다. 충돌 시 우선순위: ① 사용자 직접 지시 → ② 이 파일 → ③ 도구 기본 규칙.

---

## 0. 절대 룰

### 언어
- **한국어 전용** — 대화·설명·주석·커밋 메시지·PR 본문 모두.
- **비전공자 눈높이**: 결론 먼저 말하고, 전문용어(번들·폴링·렌더 등)는 한 줄로 풀어 쓴다. "무엇을 했고 사용자에게 뭐가 좋은지/위험한지"를 일상어로 먼저, 기술 디테일은 그다음. (단, 코드·주석·커밋의 정확성 자체는 유지.)

### 작업 절차·승인
- **절차**: 분석 → 설계(필요 시 `docs/sdd/<날짜-주제>.md` 또는 기존 `docs/superpowers/specs/`) → 사용자 승인 → 구현 → 검증 → 보고.
- **Gate 0 (편집 도구 호출 전 필수 점검)**: 어떤 파일 편집·생성 도구를 쓰기 전에 ① **현재 git 브랜치가 요청 주제와 맞는지** — 소스 코드는 `main` 직접 편집 금지, 어긋나면 멈추고 새 브랜치부터 ② 수정 대상 파일 경로·현재 줄수(아래 §파일 분리 한계 초과 여부) ③ 데이터 스키마/저장 포맷 변경 필요 여부를 먼저 확인한다.
- **Karpathy 4원칙(수정 범위 규율)**: ① 모르면 추측하지 말고 먼저 묻는다. ② 필요 이상으로 복잡하게 만들지 않는다(최소 변경). ③ 요청 범위 밖은 건드리지 않는다. ④ 수정 전후 diff 를 확인하고 보고한다.
- 큰 작업(새 화면/라우트, 의존성 추가, 데이터 저장 포맷 변경)은 **반드시 사용자 승인 후** 진행한다.

### 위험 명령 금지
- `rm -rf`, `git push --force`, `git reset --hard`, 통째 삭제·덮어쓰기류는 **사용자 명시 승인 후에만**.

---

## 1. Git 워크플로 — 1 작업 = 1 feature branch = 1 PR

리모트: `https://github.com/Lee-MJ01/wiki.git` (origin).

```
1. git checkout main && git pull origin main
2. git checkout -b feat-<주제>          # feat-/fix-/chore-/docs-/refactor- 접두사, 주제 반영. generic 이름(feat, dev) 금지
3. (작업 + 커밋 반복)
4. git push -u origin feat-<주제>
5. ⏸ STOP — PR 제목·본문·base 브랜치 초안을 한국어로 보여주고 사용자 승인 대기
6. (승인 후) gh pr create --base main ...   # 4~6 을 한 메시지에 같이 진행하지 말 것
7. (사용자가 머지 — 에이전트는 머지 명령 실행 금지)
8. git checkout main && git pull → 로컬·원격 브랜치 둘 다 삭제
```

- **main 직접 commit/push 금지.** 예외: 문서(`*.md`)·`CLAUDE.md`·`.claude/`·`docs/` 갱신, 단순 오타 수정은 사용자가 "main 에 바로"라고 명시했을 때만.
- `git push` 까지는 자동, **`gh pr create` 직전엔 반드시 멈춘다.** 머지 결정·버튼은 사용자만.

---

## 2. 검증 라인 (완료 보고 전 필수)

작업이 끝났다고 보고하기 **전에** 해당하는 것을 돌리고, 통과 로그를 근거로 보고한다. fresh 검증 증거 없이 "됐다/성공" 주장 금지.

```bash
npm run typecheck     # tsc --noEmit (타입 검사)
npm run build         # tsc -b && vite build (프로덕션 빌드 검증)
npm run dev           # 로컬 동작 확인
```

- 테스트 프레임워크 없음. 헤드리스 환경은 Google OAuth·File System Access API 때문에 자동 실행에 한계가 있으므로, 브라우저 의존이 없는 **순수 로직(마크다운 파싱·그래프 레이아웃 등)은 node 로 분리 검증**한다(`tsx`/임시 스크립트). UI 동작은 사용자 브라우저 확인을 요청한다.

---

## 3. 코드 컨벤션

- **변수명**: TypeScript = camelCase / React 컴포넌트·타입 = PascalCase. 외부 데이터(예: 마크다운 frontmatter, 저장 포맷)에서 다른 표기가 오면 **경계에서 변환**한다.
- **주석 의무**: 신규/수정 코드의 `export` 함수·타입·React props 에 **한국어 JSDoc** 을 단다(역할·입출력·도메인 의미). 자명한 로컬 변수엔 강요하지 않는다.

---

## 4. 파일 분리 규칙

| 유형 | 권장 | 최대 | 초과 시 |
|---|---:|---:|---|
| 화면/뷰 `.tsx` (`src/views/`, `src/app/`) | ~200줄 | 300줄 | 기능 단위 분할 |
| 컴포넌트 `.tsx` (`src/components/`) | ~150줄 | 250줄 | props 중심 분할 |
| 로직·서비스 `.ts` (`src/data/`, `src/markdown/`, `src/visualize/`) | ~150줄 | 300줄 | 함수 단위 파일 |

- **한 파일 = 한 책임.** React 컴포넌트 1개 = 파일 1개(내부 헬퍼 제외).
- 현재 디렉토리 구조: `src/app`(진입·셸) · `src/views`(화면) · `src/layout`(레이아웃) · `src/components`(공용 컴포넌트) · `src/data`(데이터 소스/동기화) · `src/markdown`(파싱) · `src/visualize`(그래프) · `src/theme`(테마). 새 코드는 도메인에 맞는 폴더에 둔다.

---

## 5. 모델 분리 (권장)

- **Opus** — 계획·설계·아키텍처·요구사항 분석·리뷰·문서화.
- **Sonnet** — 구현·리팩토링·디버깅.
- 권장 모드: `/model opusplan` (계획=Opus, 실행=Sonnet).

---

## 6. 상태·기억

- **이 파일(CLAUDE.md)** = 어떻게 일하나(영구 규칙). 규칙이 바뀔 때만 갱신.
- **Claude 자동메모리**(`~/.claude/projects/c--Projects-wiki/memory/`) = 진행상황·아키텍처 결정·빠른 교훈. 큰 작업의 결정·다음 액션은 여기에 남긴다.
- 같은 실수가 두 번 보이면 그 자리에서 규칙으로 승격한다(공통 규칙 → 이 파일, Claude 한정 → 자동메모리).
