import { create } from 'zustand'
import type { NoteFile, SourceKind } from '../data/types'

export type ViewKey = 'dashboard' | 'graph' | 'doc' | 'mindmap' | 'diagram'

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

export interface AppState {
  // ----- 뷰 상태 (README §7) -----
  view: ViewKey
  selectedId: string | null
  editing: boolean

  // ----- 동기화 상태 (수동 새로고침 모델) -----
  /** 새로고침/동기화 중(인디케이터 회전). */
  refreshing: boolean
  /** 마지막 동기화 시각(epoch ms). 라벨은 TopBar에서 상대시각으로 계산. */
  lastSyncedAt: number | null

  // ----- 데이터 -----
  /** 현재 활성 소스. 'none'이면 미연결. */
  sourceKind: SourceKind | 'none'
  connected: boolean
  files: NoteFile[]
  /** 전체 링크 분석(loadAllLinks) 진행 중 여부 — 그래프 레이아웃 안정화에 사용. */
  linksLoading: boolean
  /** 마지막 오류 메시지(연결/로드 실패 표시용). */
  error: string | null
  /** 접힌 폴더명 맵(true=접힘). 부재=펼침. localStorage 영속. */
  collapsed: Record<string, boolean>

  // ----- 액션 -----
  setView: (view: ViewKey) => void
  open: (id: string) => void
  toggleEdit: () => void
  setRefreshing: (refreshing: boolean) => void
  setLastSyncedAt: (ts: number) => void
  setSourceKind: (kind: SourceKind | 'none') => void
  setLinksLoading: (loading: boolean) => void
  setConnected: (connected: boolean) => void
  setFiles: (files: NoteFile[]) => void
  upsertFile: (file: NoteFile) => void
  setError: (error: string | null) => void
  toggleFolder: (name: string) => void
  removeFile: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  view: 'dashboard',
  selectedId: null,
  editing: false,

  refreshing: false,
  lastSyncedAt: null,

  sourceKind: 'none',
  connected: false,
  files: [],
  linksLoading: false,
  error: null,
  collapsed: loadCollapsed(),

  setView: (view) => set({ view }),
  open: (id) => set({ view: 'doc', selectedId: id, editing: false }),
  toggleEdit: () => set((s) => ({ editing: !s.editing })),
  setRefreshing: (refreshing) => set({ refreshing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setSourceKind: (sourceKind) => set({ sourceKind }),
  setLinksLoading: (linksLoading) => set({ linksLoading }),
  setConnected: (connected) => set({ connected }),
  setFiles: (files) =>
    set((s) => ({
      files,
      // 선택이 없으면 첫 파일을 기본 선택.
      selectedId: s.selectedId ?? files[0]?.id ?? null,
    })),
  upsertFile: (file) =>
    set((s) => {
      const idx = s.files.findIndex((f) => f.id === file.id)
      if (idx === -1) return { files: [...s.files, file] }
      const next = s.files.slice()
      next[idx] = file
      return { files: next }
    }),
  setError: (error) => set({ error }),
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
}))

/** 현재 선택된 파일을 반환하는 셀렉터 훅. */
export function useSelectedFile(): NoteFile | null {
  return useStore((s) => s.files.find((f) => f.id === s.selectedId) ?? null)
}
