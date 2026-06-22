/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth 2.0 클라이언트 ID(Phase 1). */
  readonly VITE_GOOGLE_CLIENT_ID: string
  /** Drive API 스코프(Phase 1). */
  readonly VITE_GOOGLE_SCOPE: string
  /** (선택) 볼트 루트 폴더 ID. 지정하면 이 폴더부터 .md를 탐색. */
  readonly VITE_VAULT_FOLDER_ID?: string
  /** (선택) 볼트 루트 폴더 이름. ID가 없을 때 이름으로 조회. */
  readonly VITE_VAULT_FOLDER_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
