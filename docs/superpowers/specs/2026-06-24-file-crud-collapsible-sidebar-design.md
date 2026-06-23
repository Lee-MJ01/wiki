# 파일 CRUD + 접이식 사이드바 — 설계

날짜: 2026-06-24
대상: 노트 렌즈 (Note Lens) — React 18 + TS + Vite + zustand

## 목표

1. 볼트 파일을 **추가(create) / 삭제(delete) / 수정(edit)** 모두 지원.
   - 수정은 이미 구현됨(Phase 6, `EditPane` + `saveFile`). 신규 = create + delete.
2. 사이드바 폴더 그룹을 **드롭다운(접기/펼치기)** 가능하게.

## 결정 사항 (사용자 확정)

| 항목 | 결정 |
|---|---|
| 추가/삭제 컨트롤 위치 | **양쪽** — 추가는 사이드바 폴더 헤더의 `+`, 삭제는 문서 액션바(`편집` 옆) |
| 신규 파일 이름 | **인라인 입력** — 폴더에 `+` → 텍스트 입력 → Enter로 `이름.md` 생성 후 편집 모드로 열기 (rename 불필요) |
| 삭제 안전성 | **확인 모달 + Drive 휴지통** — 로컬은 OS 영구 삭제, Drive는 trash(복구 가능) |
| 삭제 확인 UI | **커스텀 모달** — 디자인 토큰에 맞춘 인앱 확인 다이얼로그 |
| 폴더 접힘 상태 | **localStorage 영속** — 기본 펼침, 접힌 폴더만 기억 |

## 비목표 (YAGNI)

- 파일 rename — 인라인 입력으로 생성 시 이름을 정하므로 불필요.
- 폴더 생성/삭제/이동 — 파일 단위만.
- 드래그앤드롭 정렬.

## 아키텍처

### 1. DataSource 인터페이스 확장

`src/data/types.ts` 의 `DataSource`에 메서드 2개 추가:

```ts
/** 새 .md 파일 생성. 본문은 "# title\n"으로 초기화. 생성된 NoteFile 반환. */
create(folder: string, title: string): Promise<NoteFile>
/** 파일 삭제(로컬=영구, Drive=휴지통). */
remove(id: string): Promise<void>
```

`save(id, markdown)`는 그대로(수정 담당). `rename` 없음.

#### FileSystemSource

현재 `walk`는 파일 핸들만 추적. 추가로:

- `dirHandles: Map<folderName, { handle: FsDirHandle; path: string }>` — `walk` 중 폴더명→핸들/경로 기록(첫 등장 우선).
- `parentDirs: Map<fileId, FsDirHandle>` — 각 파일의 상위 디렉터리 핸들(삭제용).

- `create(folder, title)`:
  1. `dirHandles.get(folder)`(없으면 root)에서 `getFileHandle(\`${title}.md\`, { create: true })`.
  2. `createWritable()` → `write(\`# ${title}\n\`)` → `close()`.
  3. `refresh()`로 목록 재구성(핸들·parentDirs 갱신).
  4. 결정적 id(`path ? \`${path}/${title}.md\` : \`${title}.md\``)로 매칭된 NoteFile 반환.
- `remove(id)`: `parentDirs.get(id)` 핸들에서 `removeEntry(fileName)` (FS Access API엔 휴지통 개념 없음 → 영구).

> `FsDirHandle` 최소 타입에 `getFileHandle`, `removeEntry` 시그니처 추가 필요.

#### DriveSource

BFS(`buildVault`)는 이미 폴더 id를 알지만 버림. 보존:

- `folderIds: Map<folderName, string>` + `rootId: string` (`buildVault` 중 기록).

- `create(folder, title)`:
  - 부모 = `folderIds.get(folder) ?? rootId`.
  - `uploadType=multipart` 업로드 1회로 메타(name=`${title}.md`, parents, mimeType `text/markdown`) + 본문(`# ${title}\n`) 생성.
  - 응답으로 NoteFile 구성 → `this.files`에 push → 반환.
- `remove(id)`: `PATCH files/{id}` body `{ trashed: true }` → 휴지통(복구 가능).

> 충돌 주: 사이드바는 폴더 **이름**으로 그룹핑(경로 아님). 동명 폴더 2개면 `+`는 먼저 walk된 하나를 대상으로 함. 개인 볼트엔 허용 — 코드에 주석.

### 2. store (zustand) 확장

`src/app/store.ts`:

```ts
collapsed: Record<string, boolean>     // 모듈 로드 시 localStorage에서 hydrate
toggleFolder: (name: string) => void   // 토글 + localStorage("notelens.collapsedFolders") 저장
removeFile: (id: string) => void       // files[]에서 제거 + selectedId 재선택(다음 파일 또는 null)
```

- `collapsed`: 키 부재 = 펼침(기본). `true`만 접힘으로 저장.
- `removeFile`: 삭제 대상이 현재 선택이면 남은 첫 파일 또는 null로 selectedId 갱신. editing=false로.
- create/delete의 비동기 로직은 store가 아니라 controller에 둔다(DataSource 의존).

### 3. controller 글루

`src/data/controller.ts`:

```ts
createFile(folder: string, title: string): Promise<void>
// active.create → upsertFile(note) → store.open(note.id) → editing=true (바로 편집)
deleteFile(id: string): Promise<void>
// active.remove → store.removeFile(id)   (확인은 UI에서 선처리)
```

- 둘 다 `setError`로 실패 처리. `createFile`은 빈/공백 title 가드(무시).
- `deleteFile`은 확인 통과 후 호출됨(모달이 UI에서 결정).

### 4. UI

#### Sidebar.tsx — 접기 + 추가

- `FolderGroup` 헤더를 버튼화:
  - 이름 앞 쉐브론 `▾`(펼침)/`▸`(접힘). 클릭 → `toggleFolder(name)`.
  - `collapsed[name]` 참이면 파일 목록 미렌더.
  - 헤더 우측 `+` 아이콘 버튼 → 로컬 컴포넌트 state `creating` 토글.
- `creating`이면 그룹 안에 인라인 `<input>` 행 렌더:
  - Enter → `createFile(name, value.trim())` 호출 후 `creating=false`, 값 초기화.
  - Esc 또는 blur → 취소.
  - 마운트 시 autofocus.

#### ViewTabs.tsx — 삭제 버튼

- 기존 `EditButton` 옆에 `삭제` 버튼 추가.
- `selectedId != null`일 때만 표시.
- 클릭 → 확인 모달 오픈(대상 = 선택 파일). 확인 → `deleteFile(selectedId)`.

#### ConfirmModal.tsx (신규 컴포넌트)

- `src/components/ConfirmModal.tsx`.
- props: `{ open, title, message, confirmLabel, onConfirm, onCancel }`.
- 디자인 토큰(`color`, `radius`, `shadow`, `font`) 사용. 오버레이 + 카드 + 취소/확인 버튼.
- Esc=취소, 오버레이 클릭=취소. 삭제 버튼은 위험 색(`#b0574a` 계열).
- 삭제 트리거 측(ViewTabs 또는 작은 래퍼)이 open 상태를 관리.

## 데이터 흐름

```
[사이드바 +]→ 인라인입력 Enter → controller.createFile
   → active.create(폴더,제목) → 파일 쓰기 → store.upsertFile + open + editing=true
   → DocView가 EditPane 렌더(편집 시작)

[ViewTabs 삭제]→ ConfirmModal 확인 → controller.deleteFile(id)
   → active.remove(id)(로컬 removeEntry / Drive trash) → store.removeFile(id)
   → selectedId 재선택

[폴더 헤더 클릭]→ store.toggleFolder(name) → collapsed[name] 토글 + localStorage 저장
   → FolderGroup 재렌더(파일 목록 표시/숨김)
```

## 오류 처리

- `create`/`remove` 실패 → `store.setError(message)` → 기존 `ErrorBanner` 표시.
- 신규 파일 이름이 기존과 충돌(로컬): `getFileHandle({create:true})`는 기존 파일을 덮어쓰지 않고 같은 핸들 반환 → 새로 안 만들고 기존 열림. 동작상 무해하나, 생성 전 동일 폴더 동명 파일 존재 시 경고 없이 기존 열기로 처리(개인 볼트 허용). 필요시 후속 개선.
- Drive `create`/`trash` HTTP 에러 → 상태코드 포함 throw → setError.

## 테스트 전략

- 타입 검사: `npm run typecheck` (인터페이스/시그니처 정합 확인 — 1차 게이트).
- 빌드: `npm run build`.
- 수동 QA(개인 도구 — 자동 테스트 인프라 없음):
  - 로컬 폴더: 추가→편집→새로고침 후 잔존, 삭제→사라짐(파일시스템 확인).
  - Drive: 추가(웹에서 보임), 삭제→휴지통 이동 확인.
  - 사이드바: 접기/펼치기, 새로고침 후 접힘 유지(localStorage).
  - 빈 제목/Esc 취소/오버레이 취소.

## 변경 파일

| 파일 | 변경 |
|---|---|
| `src/data/types.ts` | `DataSource`에 `create`/`remove`; FS 핸들 타입에 `getFileHandle`/`removeEntry` |
| `src/data/FileSystemSource.ts` | `dirHandles`/`parentDirs` 추적, `create`/`remove` 구현 |
| `src/data/DriveSource.ts` | `folderIds`/`rootId` 보존, `create`(multipart)/`remove`(trash) 구현 |
| `src/app/store.ts` | `collapsed`/`toggleFolder`/`removeFile` + localStorage hydrate |
| `src/data/controller.ts` | `createFile`/`deleteFile` |
| `src/layout/Sidebar.tsx` | 접기 쉐브론, `+` 인라인 생성 입력 |
| `src/layout/ViewTabs.tsx` | `삭제` 버튼 + 확인 모달 연동 |
| `src/components/ConfirmModal.tsx` | 신규 — 커스텀 확인 다이얼로그 |

신규 의존성 없음.
