/**
 * 파일 이름(확장자) → 뷰에서 다룰 콘텐츠 형식 분류.
 * 볼트에서 "수집·표시할 파일 종류"를 이 한 곳에서 관리한다(md 외 html/txt/이미지/pdf 지원).
 */

/** 노트 콘텐츠 형식. md=마크다운, html/txt=텍스트, image/pdf=이진 미리보기. */
export type NoteFormat = 'md' | 'html' | 'txt' | 'image' | 'pdf'

/** 확장자(소문자, 점 없음) → 형식. 여기 없는 확장자는 볼트에서 무시한다. */
const EXT_FORMAT: Record<string, NoteFormat> = {
  md: 'md',
  markdown: 'md',
  html: 'html',
  htm: 'html',
  txt: 'txt',
  text: 'txt',
  log: 'txt',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  pdf: 'pdf',
}

/** 파일명에서 확장자 추출(소문자, 점 없음). 없으면 ''. */
export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** 파일명 → 형식. 지원하지 않는 확장자면 null(=수집 대상 아님). */
export function formatForName(name: string): NoteFormat | null {
  return EXT_FORMAT[extOf(name)] ?? null
}

/** 본문을 텍스트로 읽는 형식(md/html/txt)인지. */
export function isTextFormat(f: NoteFormat): boolean {
  return f === 'md' || f === 'html' || f === 'txt'
}

/** 이진(바이너리)으로 읽어 미리보기하는 형식(image/pdf)인지. */
export function isBinaryFormat(f: NoteFormat): boolean {
  return f === 'image' || f === 'pdf'
}

/** image/pdf 미리보기용 MIME 타입 추정(확장자 기반). object URL Blob 생성 시 사용. */
export function mimeForExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'bmp':
      return 'image/bmp'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}
