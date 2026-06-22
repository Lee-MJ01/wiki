/**
 * DataSource ↔ store 글루. React 밖에서 store를 직접 갱신한다(useStore.getState()).
 * 활성 소스(로컬 폴더 / Google Drive)를 연결 시점에 선택해 끼운다.
 */
import { useStore } from '../app/store'
import { DriveSource } from './DriveSource'
import { FileSystemSource } from './FileSystemSource'
import { buildNoteFromMarkdown, resolveTargetIn } from '../markdown/parse'
import type { DataSource, SourceKind } from './types'

let active: DataSource | null = null

function makeSource(kind: SourceKind): DataSource {
  return kind === 'local' ? new FileSystemSource() : new DriveSource()
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 소스 선택 + 연결 + 목록 로드. */
export async function connectSource(kind: SourceKind): Promise<void> {
  const st = useStore.getState()
  const source = makeSource(kind)
  st.setError(null)
  st.setRefreshing(true)
  try {
    await source.connect()
    active = source
    st.setSourceKind(kind)
    st.setConnected(true)
    const files = await source.list()
    st.setFiles(files)
    st.setLastSyncedAt(Date.now())
    void loadAllLinks()
    startAutoSync()
  } catch (e) {
    active = null
    st.setSourceKind('none')
    st.setConnected(false)
    st.setError(message(e))
  } finally {
    st.setRefreshing(false)
  }
}

/** 수동 새로고침(연결된 소스에서 목록 재로드). */
export async function refresh(): Promise<void> {
  if (!active) return
  const st = useStore.getState()
  st.setError(null)
  st.setRefreshing(true)
  try {
    const files = await active.refresh()
    st.setFiles(files)
    st.setLastSyncedAt(Date.now())
    void loadAllLinks()
  } catch (e) {
    st.setError(message(e))
  } finally {
    st.setRefreshing(false)
  }
}

let loadingAll = false

/**
 * 모든 .md를 한 번씩 읽어 링크/요약/블록을 채운다(그래프·백링크용).
 * 백그라운드로 순차 실행하며, 각 파일이 로드될 때마다 store를 갱신해 그래프가 점진적으로 채워진다.
 * 개인 볼트(수십 개) 기준 부담 없음.
 */
export async function loadAllLinks(): Promise<void> {
  if (!active || loadingAll) return
  loadingAll = true
  useStore.getState().setLinksLoading(true)
  try {
    const ids = useStore.getState().files.map((f) => f.id)
    for (const id of ids) {
      const cur = useStore.getState().files.find((f) => f.id === id)
      if (!cur || cur.markdown != null) continue
      try {
        const full = await active.read(id)
        useStore.getState().upsertFile(full)
      } catch {
        /* 개별 파일 실패는 건너뜀 */
      }
    }
  } finally {
    loadingAll = false
    useStore.getState().setLinksLoading(false)
  }
}

/** 선택 문서의 본문을 지연 로드(이미 로드됐으면 무시). */
export async function loadFileContent(id: string): Promise<void> {
  if (!active) return
  const st = useStore.getState()
  const existing = st.files.find((f) => f.id === id)
  if (existing && existing.markdown != null) return
  try {
    const full = await active.read(id)
    st.upsertFile(full)
  } catch (e) {
    st.setError(message(e))
  }
}

// ---------------- 자동 동기화(Phase 7) ----------------
// 백엔드 없는 환경에서 폴링으로 실시간 반영. 두 소스 공통.

const SYNC_INTERVAL_MS = 20_000
let syncTimer: ReturnType<typeof setInterval> | null = null

/** 파일 집합 변경 감지용 시그니처(id + 수정시각). */
function fileSig(files: { id: string; updatedAt: string }[]): string {
  return files
    .map((f) => f.id + '@' + f.updatedAt)
    .sort()
    .join('|')
}

export function startAutoSync(): void {
  if (syncTimer != null) return
  syncTimer = setInterval(() => void syncCheck(), SYNC_INTERVAL_MS)
}

export function stopAutoSync(): void {
  if (syncTimer != null) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

/**
 * 주기적 변경 확인. 변경이 없으면 조용히 시각만 갱신,
 * 변경이 있으면 바뀐 파일만 다시 파싱하도록 병합 후 재로딩.
 * 편집 중이거나 탭이 숨겨졌을 땐 건너뛴다.
 */
async function syncCheck(): Promise<void> {
  if (!active || !active.isConnected()) return
  const st = useStore.getState()
  if (st.editing) return
  if (typeof document !== 'undefined' && document.hidden) return

  try {
    const newFiles = await active.refresh()
    const prev = useStore.getState().files
    if (fileSig(newFiles) === fileSig(prev)) {
      useStore.getState().setLastSyncedAt(Date.now())
      return
    }
    // 변경 감지 → 안 바뀐 파일의 캐시(markdown/blocks/links)는 보존.
    useStore.getState().setRefreshing(true)
    const prevById = new Map(prev.map((f) => [f.id, f]))
    const merged = newFiles.map((nf) => {
      const old = prevById.get(nf.id)
      if (old && old.updatedAt === nf.updatedAt && old.markdown != null) {
        return {
          ...nf,
          markdown: old.markdown,
          blocks: old.blocks,
          links: old.links,
          summary: old.summary,
          tags: old.tags,
          type: old.type,
        }
      }
      return nf
    })
    useStore.getState().setFiles(merged)
    useStore.getState().setLastSyncedAt(Date.now())
    useStore.getState().setRefreshing(false)
    void loadAllLinks() // 새/변경 파일만 markdown==null → 다시 읽음
  } catch {
    /* 폴링 오류는 조용히 무시(다음 주기에 재시도) */
  }
}

/** 편집 결과 저장 후 재파싱해 store 갱신(Phase 6). */
export async function saveFile(id: string, markdown: string): Promise<void> {
  if (!active) throw new Error('연결된 소스가 없습니다.')
  await active.save(id, markdown)
  const st = useStore.getState()
  const base = st.files.find((f) => f.id === id)
  if (base) {
    const note = buildNoteFromMarkdown(base, markdown, (t) => resolveTargetIn(st.files, t, id))
    st.upsertFile(note)
  }
}
