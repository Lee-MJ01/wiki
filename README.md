# 노트 렌즈 (Note Lens)

Google Drive에 마크다운으로 정리된 메모를 **그래프·카드·마인드맵·다이어그램·리치 문서**로 시각화하는 개인용 도구.
디자인/요구사항 원문은 [`design_handoff_note_lens/README.md`](design_handoff_note_lens/README.md), 시각 레퍼런스는 `design_handoff_note_lens/노트 렌즈.dc.html`.

## 스택

- React 18 + TypeScript + Vite
- zustand (상태 관리)
- (예정) unified/remark — 마크다운 파싱, d3-force — 그래프, elkjs — 계층 레이아웃, Tiptap — WYSIWYG 편집
- **데이터 소스 2종** (시작 화면에서 선택):
  - **로컬 폴더** — File System Access API로 PC의 Drive for Desktop 폴더(`G:\…`) 직접 읽기/쓰기. OAuth 불필요, Chrome/Edge 전용.
  - **Google Drive** — Drive API v3 + OAuth 2.0 (GIS 토큰 플로우, 백엔드 없음). 모든 브라우저.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # 타입 검사
npm run build      # 프로덕션 빌드
```

## 데이터 소스 연결 (Phase 1)

시작 화면(사이드바/대시보드 빈 상태)에서 두 가지 중 하나를 고른다.

### A. 로컬 폴더 (권장 — Drive for Desktop 사용 시)
별도 설정 없음. **"📁 로컬 폴더 선택"** → 선택창에서 `G:\내 드라이브\…\볼트` 폴더 선택.
Drive for Desktop이 클라우드와 자동 동기화한다. Chrome/Edge 필요.

### B. Google Drive (OAuth)
1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. **Google Drive API** 활성화
3. **OAuth 2.0 클라이언트 ID(웹 애플리케이션)** 생성 — 승인된 JavaScript 원본에 `http://localhost:5173` 추가
4. `.env.example`를 `.env.local`로 복사하고 `VITE_GOOGLE_CLIENT_ID` 채우기
   - `VITE_VAULT_FOLDER_ID`는 윈도우 경로가 아니라 **Drive 웹 URL의 폴더 ID**(`…/folders/<ID>`). 비우면 내 드라이브 루트부터 탐색.
   - `VITE_GOOGLE_CLIENT_SECRET`은 프론트엔드에서 **사용하지 않는다**(번들 노출 위험).

## 구현 단계 (Drive-first · 수동 새로고침)

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 스캐폴딩 + 디자인 토큰 + 레이아웃 셸 + 상태/뷰 전환 | ✅ |
| 1 | 데이터 소스(로컬 폴더 / Google Drive) 연결 + .md 목록 → 사이드바 + 수동 새로고침 | ✅ |
| 2 | remark 파싱 → 문서뷰 블록 렌더 | ✅ |
| 3 | 위키링크 → 그래프(d3-force) + 백링크/우측패널 | ✅ |
| 4 | 대시보드 카드 | ✅ |
| 5 | 마인드맵(머리글 트리) · 자동 다이어그램(순서리스트/mermaid) | ✅ |
| 6 | 편집(마크다운 에디터 + 자동저장) + 저장(로컬 쓰기 / Drive 업로드) | ✅ |
| 7 | 실시간 동기화(폴링) — 수동 새로고침 대체 | ✅ |

## 구조

```
src/
  app/        App 셸 + zustand 스토어
  data/       NoteFile/Block 모델 + DataSource 인터페이스
  layout/     TopBar / Sidebar / ViewTabs / RightPanel
  views/      Dashboard / Graph / Doc / Mindmap / Diagram
  theme/      디자인 토큰
  components/  공용 헬퍼(useHover 등)
```
