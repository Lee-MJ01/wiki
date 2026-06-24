import type { NoteType } from '../theme/tokens'
import type { NoteFormat } from './fileFormat'

/**
 * 렌더 블록 — mdast(remark AST)에서 변환한 결과(Phase 2).
 * Phase 0에서는 타입만 정의하고, 실제 변환은 markdown/ 파이프라인에서 구현한다.
 */
export type BlockType =
  | 'h1'
  | 'h2'
  | 'p'
  | 'list'
  | 'todo'
  | 'callout'
  | 'quote'
  | 'img'
  | 'divider'

export interface Block {
  type: BlockType
  /** h1/h2/p/quote/todo/callout 본문 */
  text?: string
  /** list 항목들 */
  items?: string[]
  /** todo 완료 여부 */
  done?: boolean
  /** callout 제목 */
  title?: string
  /** img 캡션/플레이스홀더 라벨 */
  label?: string
}

/** 파일 1개의 모델(README §7). 볼트의 파일 하나에 대응(md·html·txt·이미지·pdf). */
export interface NoteFile {
  /** 안정적 식별자 — 로컬=상대경로, Drive=fileId. */
  id: string
  /** 상위(바로 위) 폴더명. 유형 매핑의 기본 소스. */
  folder: string
  /** 볼트 루트부터의 상대 폴더 경로(예: "프로젝트/2026"). 루트 파일은 ''. 사이드바 계층 트리에 사용. */
  path: string
  /** 콘텐츠 형식(확장자 기반). md만 블록 렌더·편집 대상. */
  format: NoteFormat
  /** 원본 확장자(소문자, 점 없음). 아이콘·MIME 추정용. */
  ext: string
  type: NoteType
  title: string
  /** 표시용 상대시각 라벨("2분 전") 또는 ISO 문자열. */
  updatedAt: string
  tags: string[]
  /** 이 문서가 참조하는 파일 id들(위키링크/링크에서 추출). md만 해당. */
  links: string[]
  /** frontmatter.summary || 본문 첫 문단. */
  summary: string
  /** mdast → 변환한 렌더 블록. md만 채워지며, 목록 단계에선 비어 있을 수 있다(지연 로드). */
  blocks: Block[]
  /** 텍스트 형식(md/html/txt)의 원본 텍스트(편집/재파싱·소스 보기용). 미로드 시 없음. */
  markdown?: string
  /** 이진 형식(image/pdf)의 미리보기 object URL. 미로드 시 없음. */
  objectUrl?: string
}

/** 사이드바 트리용 폴더 그룹. */
export interface FolderGroup {
  name: string
  files: NoteFile[]
}

/** 데이터 소스 종류 — 로컬 폴더(File System Access) 또는 Google Drive API. */
export type SourceKind = 'local' | 'drive'

/**
 * 데이터 소스 추상화 — UI는 이 인터페이스만 의존한다.
 * 구현체: DriveSource(Phase 1, 실제), 그리고 테스트용 InMemorySource 등.
 * "수동 새로고침" 모델에서는 subscribe 대신 refresh()를 사용한다.
 */
export interface DataSource {
  /** 로그인/토큰 확보. 이미 인증돼 있으면 즉시 resolve. */
  connect(): Promise<void>
  /** 인증 여부. */
  isConnected(): boolean
  /** 전체 파일 메타 목록(blocks는 비어 있을 수 있음). */
  list(): Promise<NoteFile[]>
  /** 단일 텍스트 파일 전체 로드(markdown + blocks 채움). md/html/txt 대상. */
  read(id: string): Promise<NoteFile>
  /** 단일 이진 파일을 Blob으로 로드(image/pdf 미리보기용). */
  readBlob(id: string): Promise<Blob>
  /** 편집 결과 저장(Phase 6). */
  save(id: string, markdown: string): Promise<void>
  /** 새 .md 파일 생성. 본문은 "# title\n"으로 초기화. 생성된 NoteFile 반환. */
  create(folder: string, title: string): Promise<NoteFile>
  /** 파일 삭제(로컬=영구, Drive=휴지통). */
  remove(id: string): Promise<void>
  /** 수동 새로고침 — Drive에서 목록을 다시 가져온다(Phase 1). */
  refresh(): Promise<NoteFile[]>
}
