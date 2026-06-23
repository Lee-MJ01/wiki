# 파일 CRUD + 접이식 사이드바 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 노트 렌즈에 파일 추가/삭제 기능과 사이드바 폴더 접기(드롭다운)를 더한다(수정은 기존 구현).

**Architecture:** `DataSource` 인터페이스에 `create`/`remove`를 추가하고 두 구현체(로컬 FS·Drive)에 실제 동작을 넣는다. zustand store에 폴더 접힘 상태(localStorage 영속)와 `removeFile`을 추가하고, controller가 create/delete 비동기 글루를 담당한다. UI는 사이드바(접기+인라인 생성), ViewTabs(삭제 버튼), 신규 ConfirmModal로 구성한다.

**Tech Stack:** React 18, TypeScript, Vite, zustand. File System Access API(로컬), Google Drive API v3(원격). 신규 의존성 없음.

## Global Constraints

- 신규 npm 의존성 추가 금지 — 기존 스택만 사용.
- 모든 색/간격/폰트는 `src/theme/tokens.ts`의 토큰 참조(하드코딩 금지). 위험 색은 `#b0574a`(기존 사용값).
- 검증 게이트: 이 프로젝트엔 자동 테스트 하니스가 없다. 각 태스크 종료 시 `npm run typecheck`(녹색)로 검증하고, 마지막에 `npm run build` + 수동 QA.
- 태스크 순서는 `npm run typecheck`가 매 태스크 경계에서 통과하도록 잡았다. 순서를 바꾸지 말 것(인터페이스 변경 태스크는 두 구현체가 먼저 메서드를 가진 뒤에 온다).
- 신규 파일 본문 초기값: `` `# ${title}\n` ``.
- localStorage 키: `notelens.collapsedFolders`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/data/types.ts` | `DataSource`에 `create`/`remove` 시그니처; FS 핸들 최소 타입에 `getFileHandle`/`removeEntry` |
| `src/data/FileSystemSource.ts` | 폴더 핸들 추적 + `create`/`remove`(로컬, 영구 삭제) |
| `src/data/driveApi.ts` | Drive 저수준 `createMarkdownFile`/`trashFile` 헬퍼 |
| `src/data/DriveSource.ts` | 폴더 id 보존 + `create`(multipart)/`remove`(trash) |
| `src/app/store.ts` | `collapsed`/`toggleFolder`/`removeFile` + localStorage hydrate |
| `src/data/controller.ts` | `createFile`/`deleteFile` 비동기 글루 |
| `src/components/ConfirmModal.tsx` | 신규 — 토큰 기반 확인 다이얼로그 |
| `src/layout/Sidebar.tsx` | 폴더 접기 쉐브론 + `+` 인라인 생성 입력 |
| `src/layout/ViewTabs.tsx` | `삭제` 버튼 + ConfirmModal 연동 |

---

## Task 1: FileSystemSource — 폴더 핸들 추적 + create/remove

로컬 소스에 `create`/`remove`를 **클래스 메서드로** 추가한다(아직 인터페이스엔 선언하지 않음 — extra 메서드는 타입 에러 없음). FS 핸들 최소 타입을 확장한다.

**Files:**
- Modify: `src/data/FileSystemSource.ts`

**Interfaces:**
- Produces: `FileSystemSource.create(folder: string, title: string): Promise<NoteFile>`, `FileSystemSource.remove(id: string): Promise<void>`

- [ ] **Step 1: FS 핸들 타입에 getFileHandle/removeEntry 추가**

`src/data/FileSystemSource.ts`의 `FsDirHandle` 인터페이스(현재 28–32행)를 아래로 교체:

```ts
interface FsDirHandle {
  kind: 'directory'
  name: string
  values(): AsyncIterableIterator<FsFileHandle | FsDirHandle>
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandle>
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>
}
```

- [ ] **Step 2: 폴더/부모 핸들 추적 필드 추가**

`handles` 필드 선언(현재 46행 부근) 바로 아래에 추가:

```ts
  /** 폴더명 → 디렉터리 핸들/경로(생성 대상). 첫 등장 우선. */
  private dirHandles = new Map<string, { handle: FsDirHandle; path: string }>()
  /** 파일 id → 상위 디렉터리 핸들(삭제용). */
  private parentDirs = new Map<string, FsDirHandle>()
```

- [ ] **Step 3: refresh에서 추적 맵 초기화**

`refresh()`의 `this.handles.clear()` 줄 뒤에 추가:

```ts
    this.dirHandles.clear()
    this.parentDirs.clear()
```

- [ ] **Step 4: walk에서 핸들 등록**

`walk(...)` 본문 맨 앞(`for await` 루프 진입 전)에 현재 디렉터리 등록 추가:

```ts
    if (!this.dirHandles.has(parentName)) {
      this.dirHandles.set(parentName, { handle: dir, path })
    }
```

그리고 `.md` 분기에서 `this.handles.set(id, entry)` 줄 바로 뒤에 추가:

```ts
        this.parentDirs.set(id, dir)
```

- [ ] **Step 5: create/remove 메서드 구현**

`save(...)` 메서드 닫는 `}` 바로 뒤(`walk` 위)에 추가:

```ts
  async create(folder: string, title: string): Promise<NoteFile> {
    if (!this.root) throw new Error('연결된 폴더가 없습니다.')
    const meta = this.dirHandles.get(folder) ?? { handle: this.root, path: '' }
    const fileName = `${title}.md`
    const id = meta.path ? `${meta.path}/${fileName}` : fileName
    const handle = await meta.handle.getFileHandle(fileName, { create: true })
    const initial = `# ${title}\n`
    const writable = await handle.createWritable()
    await writable.write(initial)
    await writable.close()
    await this.refresh()
    const found = this.files.find((f) => f.id === id)
    if (!found) throw new Error(`생성 후 파일을 찾지 못했습니다: ${id}`)
    const note: NoteFile = { ...found, markdown: initial }
    const idx = this.files.findIndex((f) => f.id === id)
    this.files[idx] = note
    return note
  }

  async remove(id: string): Promise<void> {
    const dir = this.parentDirs.get(id)
    if (!dir) throw new Error(`파일을 찾을 수 없습니다: ${id}`)
    const fileName = id.split('/').pop()!
    await dir.removeEntry(fileName)
    this.files = this.files.filter((f) => f.id !== id)
    this.handles.delete(id)
    this.parentDirs.delete(id)
  }
```

- [ ] **Step 6: typecheck**

Run: `npm run typecheck`
Expected: PASS (에러 0)

- [ ] **Step 7: Commit**

```bash
git add src/data/FileSystemSource.ts
git commit -m "feat(fs): 로컬 소스에 파일 생성/삭제 추가"
```

---

## Task 2: DriveSource — 폴더 id 보존 + create/remove

Drive 저수준 헬퍼 2개를 `driveApi.ts`에 추가하고, `DriveSource`에 폴더 id 추적 + `create`/`remove`(클래스 메서드)를 넣는다.

**Files:**
- Modify: `src/data/driveApi.ts`
- Modify: `src/data/DriveSource.ts`

**Interfaces:**
- Consumes: `DriveItem`(기존, `id,name,mimeType,modifiedTime,parents`)
- Produces: `createMarkdownFile(token, parentId, name, content): Promise<DriveItem>`, `trashFile(token, id): Promise<void>`; `DriveSource.create(folder, title)`, `DriveSource.remove(id)`

- [ ] **Step 1: driveApi에 createMarkdownFile/trashFile 추가**

`src/data/driveApi.ts` 파일 끝에 추가:

```ts
/** 마크다운 파일 생성(메타 + 본문 multipart 1회). 생성된 DriveItem 반환. */
export async function createMarkdownFile(
  token: string,
  parentId: string,
  name: string,
  content: string,
): Promise<DriveItem> {
  const boundary = 'notelens-boundary-7e3f'
  const metadata = { name, mimeType: 'text/markdown', parents: [parentId] }
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: text/markdown\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,parents',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Drive 생성 ${res.status}: ${t.slice(0, 200)}`)
  }
  return res.json() as Promise<DriveItem>
}

/** 파일을 휴지통으로 이동(복구 가능). */
export async function trashFile(token: string, id: string): Promise<void> {
  const res = await fetch(`${DRIVE}/files/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Drive 삭제 ${res.status}: ${t.slice(0, 200)}`)
  }
}
```

- [ ] **Step 2: DriveSource에 폴더 id 추적 필드 + import**

`src/data/DriveSource.ts` 상단 import에서 driveApi import에 `createMarkdownFile`, `trashFile`를 추가:

```ts
import {
  FOLDER_MIME,
  getFileText,
  listChildren,
  resolveFolderByName,
  createMarkdownFile,
  trashFile,
  type DriveItem,
} from './driveApi'
```

`private files: NoteFile[] = []` 아래에 추가:

```ts
  /** 폴더명 → Drive 폴더 id(생성 대상). */
  private folderIds = new Map<string, string>()
  /** 볼트 루트 id. */
  private rootId = 'root'
```

- [ ] **Step 3: buildVault에서 폴더 id 기록**

`buildVault`에서 `const rootId = await this.resolveRoot(token)` 줄 뒤에 추가:

```ts
    this.rootId = rootId
    this.folderIds.clear()
    this.folderIds.set('루트', rootId)
```

그리고 BFS 루프 안, 폴더 분기(`if (c.mimeType === FOLDER_MIME) {`) 내부 첫 줄에 추가:

```ts
          if (!this.folderIds.has(c.name)) this.folderIds.set(c.name, c.id)
```

- [ ] **Step 4: create/remove 메서드 구현**

`save(...)` 메서드 닫는 `}` 뒤(`resolveRoot` 위)에 추가:

```ts
  async create(folder: string, title: string): Promise<NoteFile> {
    const token = await ensureToken()
    const parentId = this.folderIds.get(folder) ?? this.rootId
    const item = await createMarkdownFile(token, parentId, `${title}.md`, `# ${title}\n`)
    const note: NoteFile = { ...this.toNoteFile(item, folder), markdown: `# ${title}\n` }
    this.files.push(note)
    return note
  }

  async remove(id: string): Promise<void> {
    const token = await ensureToken()
    await trashFile(token, id)
    this.files = this.files.filter((f) => f.id !== id)
  }
```

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/driveApi.ts src/data/DriveSource.ts
git commit -m "feat(drive): Drive 소스에 파일 생성/휴지통 삭제 추가"
```

---

## Task 3: DataSource 인터페이스에 create/remove 선언

두 구현체가 이미 메서드를 가졌으므로 인터페이스에 선언해도 typecheck 녹색.

**Files:**
- Modify: `src/data/types.ts`

**Interfaces:**
- Produces: `DataSource.create(folder: string, title: string): Promise<NoteFile>`, `DataSource.remove(id: string): Promise<void>`

- [ ] **Step 1: 인터페이스 메서드 추가**

`src/data/types.ts`의 `DataSource` 인터페이스에서 `save(...)` 선언 바로 뒤에 추가:

```ts
  /** 새 .md 파일 생성. 본문은 "# title\n"으로 초기화. 생성된 NoteFile 반환. */
  create(folder: string, title: string): Promise<NoteFile>
  /** 파일 삭제(로컬=영구, Drive=휴지통). */
  remove(id: string): Promise<void>
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS (두 구현체가 이미 메서드 보유)

- [ ] **Step 3: Commit**

```bash
git add src/data/types.ts
git commit -m "feat(data): DataSource에 create/remove 선언"
```

---

## Task 4: store — collapsed/toggleFolder/removeFile

폴더 접힘 상태(localStorage 영속)와 파일 제거 액션을 추가한다.

**Files:**
- Modify: `src/app/store.ts`

**Interfaces:**
- Produces: state `collapsed: Record<string, boolean>`; actions `toggleFolder(name: string): void`, `removeFile(id: string): void`

- [ ] **Step 1: localStorage 헬퍼 + 상수 추가**

`src/app/store.ts`에서 import 줄 바로 아래에 추가:

```ts
const COLLAPSE_KEY = 'notelens.collapsedFolders'

function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function saveCollapsed(collapsed: Record<string, boolean>): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed))
  } catch {
    /* 저장 실패는 무시 */
  }
}
```

- [ ] **Step 2: AppState에 필드/액션 선언 추가**

`AppState` 인터페이스 데이터 영역의 `error: string | null` 줄 뒤에 추가:

```ts
  /** 접힌 폴더명 맵(true=접힘). 부재=펼침. localStorage 영속. */
  collapsed: Record<string, boolean>
```

액션 영역의 `setError: ...` 줄 뒤에 추가:

```ts
  toggleFolder: (name: string) => void
  removeFile: (id: string) => void
```

- [ ] **Step 3: 초기값 + 액션 구현 추가**

`create<AppState>((set) => ({` 본문에서 `error: null,` 줄 뒤에 추가:

```ts
  collapsed: loadCollapsed(),
```

그리고 `setError: (error) => set({ error }),` 줄 뒤에 추가:

```ts
  toggleFolder: (name) =>
    set((s) => {
      const collapsed = { ...s.collapsed, [name]: !s.collapsed[name] }
      if (!collapsed[name]) delete collapsed[name]
      saveCollapsed(collapsed)
      return { collapsed }
    }),
  removeFile: (id) =>
    set((s) => {
      const files = s.files.filter((f) => f.id !== id)
      const selectedId = s.selectedId === id ? (files[0]?.id ?? null) : s.selectedId
      return { files, selectedId, editing: false }
    }),
```

- [ ] **Step 4: typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/store.ts
git commit -m "feat(store): 폴더 접힘 상태(localStorage) + removeFile"
```

---

## Task 5: controller — createFile/deleteFile

DataSource ↔ store 비동기 글루.

**Files:**
- Modify: `src/data/controller.ts`

**Interfaces:**
- Consumes: `active.create`, `active.remove`(Task 3); store `upsertFile`, `open`, `toggleEdit`, `editing`, `removeFile`, `setError`
- Produces: `createFile(folder: string, title: string): Promise<void>`, `deleteFile(id: string): Promise<void>`

- [ ] **Step 1: createFile/deleteFile 추가**

`src/data/controller.ts`의 `saveFile(...)` 함수 정의 바로 뒤(파일 끝)에 추가:

```ts
/** 새 파일 생성 후 선택 + 편집 모드로 연다. 빈 제목은 무시. */
export async function createFile(folder: string, title: string): Promise<void> {
  if (!active) return
  const name = title.trim()
  if (!name) return
  const st = useStore.getState()
  st.setError(null)
  try {
    const note = await active.create(folder, name)
    st.upsertFile(note)
    st.open(note.id)
    if (!useStore.getState().editing) useStore.getState().toggleEdit()
  } catch (e) {
    st.setError(message(e))
  }
}

/** 파일 삭제(확인은 UI에서 선처리). */
export async function deleteFile(id: string): Promise<void> {
  if (!active) return
  const st = useStore.getState()
  st.setError(null)
  try {
    await active.remove(id)
    st.removeFile(id)
  } catch (e) {
    st.setError(message(e))
  }
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/data/controller.ts
git commit -m "feat(controller): createFile/deleteFile 글루"
```

---

## Task 6: ConfirmModal 컴포넌트

토큰 기반 확인 다이얼로그. Esc/오버레이 클릭=취소.

**Files:**
- Create: `src/components/ConfirmModal.tsx`

**Interfaces:**
- Produces: `ConfirmModal` (props: `{ open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }`)

- [ ] **Step 1: 컴포넌트 작성**

`src/components/ConfirmModal.tsx` 생성:

```tsx
import { useEffect } from 'react'
import { color, font, radius, shadow } from '../theme/tokens'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 토큰 기반 확인 다이얼로그. Esc/오버레이 클릭=취소. */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '확인',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmColor = danger ? '#b0574a' : color.edgeHot

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(40,30,15,.28)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          maxWidth: '88vw',
          background: color.card,
          border: `1px solid ${color.border}`,
          borderRadius: radius.card,
          boxShadow: shadow.cardHover,
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 17,
            fontWeight: 600,
            color: color.textStrong,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: color.textSecondary, marginBottom: 20 }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 16px',
              borderRadius: radius.button,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              color: color.textSecondary,
              background: 'transparent',
              border: `1px solid ${color.border}`,
              font: 'inherit',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 16px',
              borderRadius: radius.button,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#fff',
              background: confirmColor,
              border: `1px solid ${confirmColor}`,
              font: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmModal.tsx
git commit -m "feat(ui): 확인 다이얼로그 컴포넌트"
```

---

## Task 7: Sidebar — 폴더 접기 + 인라인 생성

폴더 헤더를 토글 버튼으로 만들고, 쉐브론과 `+` 생성 입력을 추가한다.

**Files:**
- Modify: `src/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: store `collapsed`, `toggleFolder`(Task 4); `createFile`(Task 5)

- [ ] **Step 1: import 추가**

`src/layout/Sidebar.tsx` 상단 import 블록에 추가:

```ts
import { useState } from 'react'
import { createFile } from '../data/controller'
```

- [ ] **Step 2: FolderGroup 교체**

기존 `FolderGroup` 함수 전체(현재 76–99행)를 아래로 교체:

```tsx
function FolderGroup({ name, files }: { name: string; files: NoteFile[] }) {
  const chipColor = colorForType(typeForFolder(name))
  const collapsed = useStore((s) => !!s.collapsed[name])
  const toggleFolder = useStore((s) => s.toggleFolder)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')

  function startCreate(e: React.MouseEvent) {
    e.stopPropagation()
    if (collapsed) toggleFolder(name) // 생성 시 펼침
    setCreating(true)
    setDraft('')
  }

  function commit() {
    void createFile(name, draft)
    setCreating(false)
    setDraft('')
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => toggleFolder(name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 8px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            width: 10,
            fontSize: 9,
            color: color.textFaint,
            flex: 'none',
            transition: 'transform .12s',
          }}
        >
          {collapsed ? '▸' : '▾'}
        </span>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: chipColor, flex: 'none' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: color.textSecondary }}>{name}</span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            color: color.textFainter,
            marginLeft: 'auto',
          }}
        >
          {files.length}
        </span>
        <button
          onClick={startCreate}
          title="새 메모"
          style={{
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: color.textFaint,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      {!collapsed && creating && (
        <input
          autoFocus
          value={draft}
          placeholder="새 메모 이름…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') {
              setCreating(false)
              setDraft('')
            }
          }}
          onBlur={() => {
            setCreating(false)
            setDraft('')
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            margin: '2px 0 4px',
            padding: '6px 10px',
            fontSize: 13,
            color: color.text,
            background: color.focusBg,
            border: `1px solid ${color.borderHover}`,
            borderRadius: radius.chip,
            outline: 'none',
          }}
        />
      )}

      {!collapsed && files.map((f) => <FileItem key={f.id} file={f} />)}
    </div>
  )
}
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/layout/Sidebar.tsx
git commit -m "feat(sidebar): 폴더 접기 + 인라인 새 메모 생성"
```

---

## Task 8: ViewTabs — 삭제 버튼 + ConfirmModal 연동

문서 선택 시 `삭제` 버튼을 노출하고 확인 모달을 거쳐 삭제한다.

**Files:**
- Modify: `src/layout/ViewTabs.tsx`

**Interfaces:**
- Consumes: store `selectedId`, `useSelectedFile`; `deleteFile`(Task 5); `ConfirmModal`(Task 6)

- [ ] **Step 1: import + 상태 추가**

`src/layout/ViewTabs.tsx` 상단 import 블록을 아래로 교체:

```ts
import { useState } from 'react'
import { color, radius } from '../theme/tokens'
import { useStore, useSelectedFile, type ViewKey } from '../app/store'
import { useHover } from '../components/useHover'
import { deleteFile } from '../data/controller'
import { ConfirmModal } from '../components/ConfirmModal'
```

- [ ] **Step 2: ViewTabs 본문에 삭제 버튼 + 모달 추가**

`ViewTabs` 함수를 아래로 교체:

```tsx
export function ViewTabs() {
  const view = useStore((s) => s.view)
  const editing = useStore((s) => s.editing)
  const toggleEdit = useStore((s) => s.toggleEdit)
  const selectedId = useStore((s) => s.selectedId)
  const selected = useSelectedFile()
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      style={{
        height: 50,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 18px',
        background: color.bar,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      {TABS.map(([key, label]) => (
        <Tab key={key} tabKey={key} label={label} active={view === key} />
      ))}

      <div style={{ flex: 1 }} />

      {view === 'doc' && <EditButton editing={editing} onClick={toggleEdit} />}
      {selectedId != null && <DeleteButton onClick={() => setConfirming(true)} />}

      <ConfirmModal
        open={confirming}
        danger
        title="메모 삭제"
        message={`"${selected?.title ?? ''}" 메모를 삭제할까요? 이 동작은 되돌릴 수 없습니다(로컬 폴더는 영구 삭제, Drive는 휴지통으로 이동).`}
        confirmLabel="삭제"
        onConfirm={() => {
          if (selectedId != null) void deleteFile(selectedId)
          setConfirming(false)
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
```

- [ ] **Step 3: DeleteButton 컴포넌트 추가**

파일 끝(`EditButton` 함수 뒤)에 추가:

```tsx
function DeleteButton({ onClick }: { onClick: () => void }) {
  const { hover, hoverProps } = useHover()
  return (
    <div
      {...hoverProps}
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: radius.button,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        color: hover ? '#fff' : '#b0574a',
        background: hover ? '#b0574a' : 'transparent',
        border: '1px solid #d8b3a8',
      }}
    >
      삭제
    </div>
  )
}
```

- [ ] **Step 4: typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layout/ViewTabs.tsx
git commit -m "feat(viewtabs): 삭제 버튼 + 확인 모달"
```

---

## Task 9: 빌드 + 수동 QA

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 에러 없이 완료(`dist/` 생성)

- [ ] **Step 2: 개발 서버에서 수동 QA**

Run: `npm run dev` → http://localhost:5173

체크리스트:
- 로컬 폴더 연결 → 사이드바 폴더 헤더 클릭 → 접힘/펼침 동작.
- 페이지 새로고침 → 접힌 폴더 유지(localStorage).
- 폴더 `+` → 인라인 입력 표시 → 이름 입력 + Enter → 새 파일 생성 + 편집 모드 진입.
- 빈 이름 + Enter → 아무 일 없음. Esc/포커스 아웃 → 입력 취소.
- 문서 선택 시 상단에 `삭제` 버튼 노출 → 클릭 → 확인 모달.
- 모달 취소(버튼/Esc/오버레이) → 삭제 안 됨. 확인 → 파일 사라지고 선택이 다음 파일로 이동.
- 로컬: 새로고침 후에도 생성/삭제 반영(파일 시스템 확인). Drive(연결 시): 생성 파일 웹에 보임, 삭제는 휴지통 이동.

- [ ] **Step 3: 최종 커밋(필요 시)**

QA 중 수정이 없으면 생략. 있으면 해당 파일만 커밋.

---

## Self-Review

**Spec coverage:**
- 추가(create) → Task 1(FS)·2(Drive)·3(interface)·5(controller)·7(sidebar UI). ✅
- 삭제(delete) → Task 1·2·3·5·6(modal)·8(button). ✅ 확인 모달 + Drive 휴지통/로컬 영구 반영. ✅
- 수정(edit) → 기존 구현(범위 외, 변경 없음). ✅
- 폴더 접기(드롭다운) → Task 4(state+localStorage)·7(UI). ✅ 영속. ✅
- 삭제 컨트롤 위치=문서 액션바(ViewTabs) → Task 8. 추가=사이드바 → Task 7. ✅
- 신규 파일=인라인 입력 → Task 7. ✅
- 확인=커스텀 모달 → Task 6. ✅

**Placeholder scan:** 모든 코드 단계에 실제 코드 포함. TBD/TODO 없음. ✅

**Type consistency:** `create(folder, title)`/`remove(id)` 시그니처가 types.ts·FileSystemSource·DriveSource·controller에서 일치. store `removeFile(id)`·`toggleFolder(name)`·`collapsed` 이름 일치. ConfirmModal props가 ViewTabs 사용처와 일치. controller `createFile`/`deleteFile`가 Sidebar/ViewTabs 사용처와 일치. ✅
