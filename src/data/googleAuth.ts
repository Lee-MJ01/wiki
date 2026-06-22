/**
 * Google Identity Services(GIS) 토큰 플로우.
 * 백엔드 없는 SPA용 — Client ID만 사용하고 클라이언트 시크릿은 쓰지 않는다.
 * 토큰은 짧은 수명(약 1시간)이며 refresh token은 발급되지 않는다(만료 시 재요청).
 */

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (resp: TokenResponse) => void
  error_callback?: (err: { type: string; message?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient
        }
      }
    }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE =
  import.meta.env.VITE_GOOGLE_SCOPE || 'https://www.googleapis.com/auth/drive'

let scriptPromise: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let expiresAt = 0
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google Identity Services 스크립트 로드 실패'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

async function getTokenClient(): Promise<TokenClient> {
  if (tokenClient) return tokenClient
  if (!CLIENT_ID) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID가 비어 있습니다. .env.local에 OAuth 클라이언트 ID를 설정하세요.',
    )
  }
  await loadGis()
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) {
        pending?.reject(new Error(resp.error_description || resp.error))
        pending = null
        return
      }
      accessToken = resp.access_token
      // 60초 여유를 두고 만료 처리.
      expiresAt = Date.now() + (resp.expires_in - 60) * 1000
      pending?.resolve(accessToken)
      pending = null
    },
    error_callback: (err) => {
      pending?.reject(new Error(err.message || err.type || '인증이 취소되었습니다.'))
      pending = null
    },
  })
  return tokenClient
}

export function hasValidToken(): boolean {
  return !!accessToken && Date.now() < expiresAt
}

/**
 * 액세스 토큰 확보. 유효하면 즉시 반환.
 * interactive=false면 무팝업(prompt:'none')으로 조용히 시도하고, 실패는 reject한다.
 */
export function requestToken(interactive = true): Promise<string> {
  if (hasValidToken()) return Promise.resolve(accessToken!)
  return getTokenClient().then(
    (client) =>
      new Promise<string>((resolve, reject) => {
        pending = { resolve, reject }
        try {
          client.requestAccessToken({ prompt: interactive ? '' : 'none' })
        } catch (e) {
          pending = null
          reject(e as Error)
        }
      }),
  )
}

/** 유효 토큰이 있으면 그대로, 없으면 조용히 시도 후 실패하면 팝업으로 승급. */
export async function ensureToken(): Promise<string> {
  if (hasValidToken()) return accessToken!
  try {
    return await requestToken(false)
  } catch {
    return requestToken(true)
  }
}
