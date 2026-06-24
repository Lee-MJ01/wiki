import type { DataSource, NoteFile } from './types'
import { ensureToken, hasValidToken, requestToken } from './googleAuth'
import {
  FOLDER_MIME,
  getFileText,
  getFileBlob,
  listChildren,
  resolveFolderByName,
  createMarkdownFile,
  trashFile,
  type DriveItem,
} from './driveApi'
import { typeForFolder } from './classify'
import { formatRelative, stripExt } from './format'
import { formatForName, type NoteFormat } from './fileFormat'
import { buildNoteFromMarkdown, resolveTargetIn } from '../markdown/parse'

/** 폴더 트리 BFS 시 폭주 방지 한계. */
const MAX_FOLDERS = 500
const MAX_DEPTH = 6

/**
 * Google Drive 기반 DataSource.
 * 볼트 루트(env VITE_VAULT_FOLDER_ID / NAME, 없으면 My Drive 루트)에서
 * 지원 형식 파일(md/html/txt/이미지/pdf)을 BFS로 수집해 NoteFile[]로 변환한다.
 * 폴더 경로(path)를 함께 누적해 사이드바 계층 트리를 정확히 표시한다.
 */
export class DriveSource implements DataSource {
  private files: NoteFile[] = []
  /** 폴더 경로 → Drive 폴더 id(생성 대상). 루트는 ''. */
  private folderIds = new Map<string, string>()
  /** 볼트 루트 id. */
  private rootId = 'root'

  async connect(): Promise<void> {
    await requestToken(true)
  }

  isConnected(): boolean {
    return hasValidToken()
  }

  async list(): Promise<NoteFile[]> {
    if (this.files.length === 0) return this.refresh()
    return this.files
  }

  async refresh(): Promise<NoteFile[]> {
    const token = await ensureToken()
    this.files = await this.buildVault(token)
    return this.files
  }

  async read(id: string): Promise<NoteFile> {
    const token = await ensureToken()
    const idx = this.files.findIndex((f) => f.id === id)
    const base: NoteFile =
      idx >= 0
        ? this.files[idx]
        : {
            id,
            folder: '루트',
            path: '',
            format: 'md',
            ext: 'md',
            type: '기록',
            title: id,
            updatedAt: '',
            tags: [],
            links: [],
            summary: '',
            blocks: [],
          }
    const text = await getFileText(token, id)
    // md만 블록·링크 파싱. html/txt는 원본 텍스트만 보관.
    if (base.format === 'md') {
      const note = buildNoteFromMarkdown(base, text, (t) => resolveTargetIn(this.files, t, base.id))
      if (idx >= 0) this.files[idx] = note
      return note
    }
    const note: NoteFile = { ...base, markdown: text }
    if (idx >= 0) this.files[idx] = note
    return note
  }

  async readBlob(id: string): Promise<Blob> {
    const token = await ensureToken()
    return getFileBlob(token, id)
  }

  async save(id: string, markdown: string): Promise<void> {
    const token = await ensureToken()
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/markdown' },
        body: markdown,
      },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Drive 저장 ${res.status}: ${body.slice(0, 200)}`)
    }
    const idx = this.files.findIndex((f) => f.id === id)
    if (idx >= 0) this.files[idx] = { ...this.files[idx], markdown }
  }

  async create(folderPath: string, title: string): Promise<NoteFile> {
    const token = await ensureToken()
    const parentId = this.folderIds.get(folderPath) ?? this.rootId
    const item = await createMarkdownFile(token, parentId, `${title}.md`, `# ${title}\n`)
    const leaf = folderPath.split('/').pop() || '루트'
    const note: NoteFile = {
      ...this.toNoteFile(item, leaf, folderPath, 'md'),
      markdown: `# ${title}\n`,
    }
    this.files.push(note)
    return note
  }

  async remove(id: string): Promise<void> {
    const token = await ensureToken()
    await trashFile(token, id)
    this.files = this.files.filter((f) => f.id !== id)
  }

  /** 볼트 루트를 결정. */
  private async resolveRoot(token: string): Promise<string> {
    const envId = import.meta.env.VITE_VAULT_FOLDER_ID
    if (envId) return envId
    const envName = import.meta.env.VITE_VAULT_FOLDER_NAME
    if (envName) {
      const id = await resolveFolderByName(token, envName)
      if (id) return id
    }
    return 'root'
  }

  /** 루트부터 BFS로 하위 폴더를 돌며 지원 형식 파일을 폴더 경로와 함께 수집. */
  private async buildVault(token: string): Promise<NoteFile[]> {
    const rootId = await this.resolveRoot(token)
    this.rootId = rootId
    this.folderIds.clear()
    this.folderIds.set('', rootId)
    const items: { item: DriveItem; parentName: string; path: string; format: NoteFormat }[] = []
    const queue: { id: string; name: string; path: string; depth: number }[] = [
      { id: rootId, name: '루트', path: '', depth: 0 },
    ]
    let folderCount = 0

    while (queue.length > 0 && folderCount < MAX_FOLDERS) {
      const { id, name, path, depth } = queue.shift()!
      folderCount++
      const children = await listChildren(token, id)
      for (const c of children) {
        if (c.mimeType === FOLDER_MIME) {
          const sub = path ? `${path}/${c.name}` : c.name
          if (!this.folderIds.has(sub)) this.folderIds.set(sub, c.id)
          if (depth < MAX_DEPTH) queue.push({ id: c.id, name: c.name, path: sub, depth: depth + 1 })
        } else {
          const fmt = formatForName(c.name)
          if (fmt) items.push({ item: c, parentName: name, path, format: fmt })
        }
      }
    }

    return items.map(({ item, parentName, path, format }) =>
      this.toNoteFile(item, parentName, path, format),
    )
  }

  private toNoteFile(
    item: DriveItem,
    parentName: string,
    path: string,
    format: NoteFormat,
  ): NoteFile {
    const ext = item.name.includes('.') ? item.name.split('.').pop()!.toLowerCase() : ''
    return {
      id: item.id,
      folder: parentName,
      path,
      format,
      ext,
      type: typeForFolder(parentName),
      title: stripExt(item.name),
      updatedAt: formatRelative(item.modifiedTime),
      tags: [],
      links: [],
      summary: '',
      blocks: [],
    }
  }
}
