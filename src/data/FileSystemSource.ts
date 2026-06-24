import type { DataSource, NoteFile } from './types'
import { typeForFolder } from './classify'
import { formatRelativeMs, stripExt } from './format'
import { formatForName, type NoteFormat } from './fileFormat'
import { saveVaultHandle } from './handleStore'
import { buildNoteFromMarkdown, resolveTargetIn } from '../markdown/parse'

/**
 * 로컬 폴더 기반 DataSource — 브라우저 File System Access API 사용.
 * PC에 설치된 Google Drive for Desktop의 폴더(예: G:\내 드라이브\...\볼트)를
 * 선택창으로 고른 뒤, 로컬 파일을 직접 읽고 쓴다. Drive for Desktop이 클라우드와
 * 자동 동기화하므로 OAuth/Client ID가 필요 없다. Chrome/Edge 전용.
 * 선택한 폴더 핸들은 IndexedDB에 저장돼 새로고침 후 같은 볼트로 복원된다.
 */

const MAX_DEPTH = 8

// --- File System Access API 최소 타입(브라우저별 lib.dom 차이를 피하려 자체 정의) ---
type DirMode = 'read' | 'readwrite'
interface FsWritable {
  write(data: string | Blob | BufferSource): Promise<void>
  close(): Promise<void>
}
interface FsFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<FsWritable>
}
interface FsDirHandle {
  kind: 'directory'
  name: string
  values(): AsyncIterableIterator<FsFileHandle | FsDirHandle>
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandle>
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>
  queryPermission?(opts?: { mode?: DirMode }): Promise<PermissionState>
  requestPermission?(opts?: { mode?: DirMode }): Promise<PermissionState>
}
type ShowDirPicker = (opts?: { mode?: DirMode }) => Promise<FsDirHandle>

function getPicker(): ShowDirPicker | undefined {
  return (window as unknown as { showDirectoryPicker?: ShowDirPicker }).showDirectoryPicker
}

export function isFileSystemAccessSupported(): boolean {
  return !!getPicker()
}

/**
 * 복원한 폴더 핸들의 읽기·쓰기 권한 상태를 조회/요청한다.
 * request=false: 조용히 조회(queryPermission). request=true: 사용자 제스처에서 권한 요청.
 * 'granted'면 바로 사용 가능, 'prompt'면 한 번 더 요청 필요, 'denied'면 거부.
 */
export async function handlePermission(handle: unknown, request: boolean): Promise<PermissionState> {
  const h = handle as FsDirHandle
  const opts = { mode: 'readwrite' as DirMode }
  try {
    if (request) return (await h.requestPermission?.(opts)) ?? 'denied'
    return (await h.queryPermission?.(opts)) ?? 'prompt'
  } catch {
    return 'denied'
  }
}

export class FileSystemSource implements DataSource {
  private root: FsDirHandle | null = null
  private files: NoteFile[] = []
  /** id(상대경로) → 파일 핸들. read/save 시 재사용. */
  private handles = new Map<string, FsFileHandle>()
  /** 폴더 경로 → 디렉터리 핸들/경로(생성 대상). 루트는 ''. */
  private dirHandles = new Map<string, { handle: FsDirHandle; path: string }>()
  /** 파일 id → 상위 디렉터리 핸들(삭제용). */
  private parentDirs = new Map<string, FsDirHandle>()

  async connect(): Promise<void> {
    const picker = getPicker()
    if (!picker) {
      throw new Error(
        '이 브라우저는 로컬 폴더 접근(File System Access API)을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.',
      )
    }
    // 사용자 제스처(버튼 클릭)에서 호출되어야 함.
    this.root = await picker({ mode: 'readwrite' })
    await saveVaultHandle(this.root) // 새로고침 후 복원용으로 IndexedDB에 저장.
  }

  /** IndexedDB에서 복원한 핸들로 연결한다(권한은 호출 측에서 미리 확인). */
  adopt(handle: unknown): void {
    this.root = handle as FsDirHandle
  }

  /** 현재 볼트 폴더 이름(칩 라벨용). */
  rootName(): string {
    return this.root?.name ?? ''
  }

  isConnected(): boolean {
    return this.root !== null
  }

  async list(): Promise<NoteFile[]> {
    if (this.files.length === 0) return this.refresh()
    return this.files
  }

  async refresh(): Promise<NoteFile[]> {
    if (!this.root) throw new Error('연결된 폴더가 없습니다.')
    this.handles.clear()
    this.dirHandles.clear()
    this.parentDirs.clear()
    const out: NoteFile[] = []
    await this.walk(this.root, this.root.name, '', 0, out)
    this.files = out
    return out
  }

  async read(id: string): Promise<NoteFile> {
    const handle = this.handles.get(id)
    if (!handle) throw new Error(`파일을 찾을 수 없습니다: ${id}`)
    const file = await handle.getFile()
    const idx = this.files.findIndex((f) => f.id === id)
    const fmt = formatForName(handle.name) ?? 'md'
    const base =
      idx >= 0 ? this.files[idx] : this.toNoteFile(id, handle.name, '루트', '', file.lastModified, fmt)
    // md만 블록·링크 파싱. html/txt는 원본 텍스트만 보관(소스/렌더는 뷰에서 처리).
    if (base.format === 'md') {
      const md = await file.text()
      const note = buildNoteFromMarkdown(base, md, (t) => resolveTargetIn(this.files, t, base.id))
      if (idx >= 0) this.files[idx] = note
      return note
    }
    const text = await file.text()
    const note: NoteFile = { ...base, markdown: text }
    if (idx >= 0) this.files[idx] = note
    return note
  }

  async readBlob(id: string): Promise<Blob> {
    const handle = this.handles.get(id)
    if (!handle) throw new Error(`파일을 찾을 수 없습니다: ${id}`)
    return handle.getFile() // File은 Blob의 하위 타입.
  }

  async save(id: string, markdown: string): Promise<void> {
    const handle = this.handles.get(id)
    if (!handle) throw new Error(`파일을 찾을 수 없습니다: ${id}`)
    const writable = await handle.createWritable()
    await writable.write(markdown)
    await writable.close()
  }

  async create(folderPath: string, title: string): Promise<NoteFile> {
    if (!this.root) throw new Error('연결된 폴더가 없습니다.')
    const meta = this.dirHandles.get(folderPath) ?? { handle: this.root, path: '' }
    const fileName = `${title}.md`
    const id = meta.path ? `${meta.path}/${fileName}` : fileName
    const handle = await meta.handle.getFileHandle(fileName, { create: true })
    const initial = `# ${title}\n`
    const writable = await handle.createWritable()
    await writable.write(initial)
    await writable.close()
    await this.refresh()
    const idx = this.files.findIndex((f) => f.id === id)
    if (idx < 0) throw new Error(`생성 후 파일을 찾지 못했습니다: ${id}`)
    const note: NoteFile = { ...this.files[idx], markdown: initial }
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

  /** 디렉터리 핸들을 재귀 순회하며 지원 형식 파일을 수집(md/html/txt/이미지/pdf). */
  private async walk(
    dir: FsDirHandle,
    parentName: string,
    path: string,
    depth: number,
    out: NoteFile[],
  ): Promise<void> {
    if (!this.dirHandles.has(path)) {
      this.dirHandles.set(path, { handle: dir, path })
    }
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (depth < MAX_DEPTH) {
          const sub = path ? `${path}/${entry.name}` : entry.name
          await this.walk(entry, entry.name, sub, depth + 1, out)
        }
      } else {
        const fmt = formatForName(entry.name)
        if (!fmt) continue // 지원하지 않는 확장자는 건너뜀.
        const id = path ? `${path}/${entry.name}` : entry.name
        this.handles.set(id, entry)
        this.parentDirs.set(id, dir)
        const file = await entry.getFile()
        out.push(this.toNoteFile(id, entry.name, parentName, path, file.lastModified, fmt))
      }
    }
  }

  private toNoteFile(
    id: string,
    fileName: string,
    parentName: string,
    path: string,
    lastModified: number,
    format: NoteFormat,
  ): NoteFile {
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
    return {
      id,
      folder: parentName,
      path,
      format,
      ext,
      type: typeForFolder(parentName),
      title: stripExt(fileName),
      updatedAt: formatRelativeMs(lastModified),
      tags: [],
      links: [],
      summary: '',
      blocks: [],
    }
  }
}
