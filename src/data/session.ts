import type { SourceKind } from './types'

/**
 * 마지막으로 연결했던 소스 종류(local/drive)를 localStorage에 기억한다.
 * 새로고침 시 어떤 방식으로 볼트를 복원할지 판단하는 데 쓴다(볼트 "고정").
 */
const KEY = 'notelens.sourceKind'

/** 저장된 마지막 소스 종류. 없으면 null. */
export function getLastSourceKind(): SourceKind | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'local' || v === 'drive' ? v : null
  } catch {
    return null
  }
}

/** 마지막 소스 종류 저장(연결 시) 또는 제거(연결 해제 시 null). */
export function setLastSourceKind(kind: SourceKind | null): void {
  try {
    if (kind) localStorage.setItem(KEY, kind)
    else localStorage.removeItem(KEY)
  } catch {
    /* 저장 실패는 무시 */
  }
}
