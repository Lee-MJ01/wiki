/** 표시용 포맷 유틸. */

/** ".md" 확장자 제거 → 문서 제목. */
export function stripMdExt(name: string): string {
  return name.replace(/\.md$/i, '')
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
