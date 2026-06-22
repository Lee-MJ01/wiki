/** Google Drive API v3 저수준 REST 호출(fetch 기반). */

const DRIVE = 'https://www.googleapis.com/drive/v3'
export const FOLDER_MIME = 'application/vnd.google-apps.folder'

export interface DriveItem {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  parents?: string[]
}

interface FileListResponse {
  files?: DriveItem[]
  nextPageToken?: string
}

async function driveFetch(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<FileListResponse> {
  const url = new URL(DRIVE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive API ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json() as Promise<FileListResponse>
}

/** 폴더의 직속 자식(폴더+파일)을 페이지네이션 끝까지 수집. */
export async function listChildren(token: string, folderId: string): Promise<DriveItem[]> {
  const items: DriveItem[] = []
  let pageToken: string | undefined
  do {
    const data = await driveFetch('/files', token, {
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,parents)',
      pageSize: '1000',
      orderBy: 'folder,name',
      ...(pageToken ? { pageToken } : {}),
    })
    if (data.files) items.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)
  return items
}

/** 이름으로 폴더 ID 조회(첫 매치). */
export async function resolveFolderByName(token: string, name: string): Promise<string | null> {
  const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const data = await driveFetch('/files', token, {
    q: `name='${escaped}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: '10',
  })
  return data.files?.[0]?.id ?? null
}

/** 파일 본문(텍스트) 다운로드. */
export async function getFileText(token: string, id: string): Promise<string> {
  const res = await fetch(`${DRIVE}/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive 다운로드 ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.text()
}
