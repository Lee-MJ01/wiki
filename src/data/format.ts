/** 표시용 포맷 유틸. */

/** ".md" 확장자 제거 → 문서 제목. */
export function stripMdExt(name: string): string {
  return name.replace(/\.md$/i, '')
}

/** 마지막 확장자 1개 제거 → 표시 제목(모든 형식 공통). 점으로 시작하는 이름은 그대로. */
export function stripExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** epoch ms → "방금 / N분 전 / N시간 전 / 어제 / N일 전 / YYYY-MM-DD". */
export function formatRelativeMs(ms: number): string {
  if (Number.isNaN(ms)) return ''
  const min = Math.floor((Date.now() - ms) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day === 1) return '어제'
  if (day < 7) return `${day}일 전`
  return new Date(ms).toISOString().slice(0, 10)
}

/** ISO 수정시각 → 상대시각 라벨. */
export function formatRelative(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return formatRelativeMs(t)
}
