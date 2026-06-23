import type { DataSource, NoteFile } from './types'
import { typeForFolder } from './classify'
import { formatRelativeMs, stripMdExt } from './format'
import { buildNoteFromMarkdown, resolveTargetIn } from '../markdown/parse'

/**
 * 로컬 폴더 기반 DataSource — 브라우저 File System Access API 사용.
 * PC에 설치된 Google Drive for Desktop의 폴더(예: G:\내 드라이브\...\볼트)를
 * 선택창으로 고른 뒤, 로컬 파일을 직접 읽고 쓴다. Drive for Desktop이 클라우드와
 * 자동 동기화하므로 OAuth/Client ID가 필요 없다. Chrome/Edge 전용.
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
}
type ShowDirPicker = (opts?: { mode?: DirMode }) => Promise<FsDirHandle>

function getPicker(): ShowDirPicker | undefined {
  return (window as unknown as { showDirectoryPicker?: ShowDirPicker }).showDirectoryPicker
}

export function isFileSystemAccessSupported(): boolean {
  return !!getPicker()
}

export class FileSystemSource implements DataSource {
  private root: FsDirHandle | null = null
  private files: NoteFile[] = []
  /** id(상대경로) → 파일 핸들. read/save 시 재사용. */
  private handles = new Map<string, FsFileHandle>()
  /** 폴더명 → 디렉터리 핸들/경로(생성 대상). 첫 등장 우선. */
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
    const md = await file.text()
    const idx = this.files.findIndex((f) => f.id === id)
    const base = idx >= 0 ? this.files[idx] : this.toNoteFile(id, handle.name, '루트', file.lastModified)
    const note = buildNoteFromMarkdown(base, md, (t) => resolveTargetIn(this.files, t, base.id))
    if (idx >= 0) this.files[idx] = note
    return note
  }

  async save(id: string, markdown: string): Promise<void> {
    const handle = this.handles.get(id)
    if (!handle) throw new Error(`파일을 찾을 수 없습니다: ${id}`)
    const writable = await handle.createWritable()
    await writable.write(markdown)
    await writable.close()
  }

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

  /** 디렉터리 핸들을 재귀 순회하며 .md 파일을 수집. */
  private async walk(
    dir: FsDirHandle,
    parentName: string,
    path: string,
    depth: number,
    out: NoteFile[],
  ): Promise<void> {
    if (!this.dirHandles.has(parentName)) {
      this.dirHandles.set(parentName, { handle: dir, path })
    }
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') {
        if (depth < MAX_DEPTH) {
          const sub = path ? `${path}/${entry.name}` : entry.name
          await this.walk(entry, entry.name, sub, depth + 1, out)
        }
      } else if (entry.name.toLowerCase().endsWith('.md')) {
        const id = path ? `${path}/${entry.name}` : entry.name
        this.handles.set(id, entry)
        this.parentDirs.set(id, dir)
        const file = await entry.getFile()
        out.push(this.toNoteFile(id, entry.name, parentName, file.lastModified))
      }
    }
  }

  private toNoteFile(id: string, fileName: string, parentName: string, lastModified: number): NoteFile {
    return {
      id,
      folder: parentName,
      type: typeForFolder(parentName),
      title: stripMdExt(fileName),
      updatedAt: formatRelativeMs(lastModified),
      tags: [],
      links: [],
      summary: '',
      blocks: [],
    }
  }
}
