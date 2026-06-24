/**
 * 로컬 폴더 핸들(showDirectoryPicker 결과)을 IndexedDB에 저장/복원한다.
 * 새로고침해도 같은 볼트를 다시 고르지 않도록 "고정"하기 위한 저장소다.
 * 디렉터리 핸들은 구조화 복제로 IndexedDB에 보존된다(localStorage에는 저장 불가).
 */

const DB_NAME = 'notelens'
const STORE = 'kv'
const KEY = 'vaultDir'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 열기 실패'))
  })
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = op(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB 작업 실패'))
        t.oncomplete = () => db.close()
      }),
  )
}

/** 마지막으로 연 로컬 볼트 폴더 핸들을 저장한다. 저장 실패는 조용히 무시. */
export async function saveVaultHandle(handle: unknown): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(handle, KEY))
  } catch {
    /* 저장 실패는 무시(다음 연결에서 다시 저장) */
  }
}

/** 저장된 로컬 볼트 폴더 핸들을 복원한다. 없거나 실패하면 null. */
export async function loadVaultHandle<T = unknown>(): Promise<T | null> {
  try {
    const v = await run<T>('readonly', (s) => s.get(KEY))
    return v ?? null
  } catch {
    return null
  }
}

/** 저장된 핸들 삭제(볼트 연결 해제 시). */
export async function clearVaultHandle(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY))
  } catch {
    /* 무시 */
  }
}
