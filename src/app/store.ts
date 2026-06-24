import { create } from 'zustand'
import type { NoteFile, SourceKind } from '../data/types'

export type ViewKey = 'dashboard' | 'graph' | 'doc' | 'mindmap' | 'diagram'

const COLLAPSE_KEY = 'notelens.collapsedFolders'
const SIDEBAR_WIDTH_KEY = 'notelens.sidebarWidth'

/** 사이드바 폭 허용 범위(px). */
export const SIDEBAR_MIN_WIDTH = 180
export const SIDEBAR_MAX_WIDTH = 560
const SIDEBAR_DEFAULT_WIDTH = 252

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

function clampWidth(w: number): number {
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(w)))
}

function loadSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    return raw ? clampWidth(Number(raw)) : SIDEBAR_DEFAULT_WIDTH
  } catch {
    return SIDEBAR_DEFAULT_WIDTH
  }
}

/** 새로고침 후 자동 복원이 권한 재요청을 필요로 할 때 UI에 보여줄 "다시 열기" 대상. */
export interface RestorableVault {
  kind: SourceKind
  /** 버튼 라벨용(이전 볼트 폴더명 등). */
  label: string
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
  /** 접힌 폴더 경로 맵(true=접힘). 부재=펼침. localStorage 영속. */
  collapsed: Record<string, boolean>
  /** 사이드바 가로 폭(px). 드래그로 조절, localStorage 영속. */
  sidebarWidth: number
  /** 새로고침 후 자동 복원이 한 번의 클릭(권한 재요청/재로그인)을 요구할 때의 대상. null=불필요. */
  restorable: RestorableVault | null

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
  setSidebarWidth: (width: number) => void
  setRestorable: (restorable: RestorableVault | null) => void
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
  sidebarWidth: loadSidebarWidth(),
  restorable: null,

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
  setSidebarWidth: (width) => {
    const w = clampWidth(width)
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
    } catch {
      /* 저장 실패는 무시 */
    }
    set({ sidebarWidth: w })
  },
  setRestorable: (restorable) => set({ restorable }),
}))

/** 현재 선택된 파일을 반환하는 셀렉터 훅. */
export function useSelectedFile(): NoteFile | null {
  return useStore((s) => s.files.find((f) => f.id === s.selectedId) ?? null)
}
