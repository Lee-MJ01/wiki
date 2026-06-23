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
