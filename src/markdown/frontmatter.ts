import { parse as parseYaml } from 'yaml'

export type Frontmatter = Record<string, unknown>

/**
 * 선행 `---` YAML 프론트매터를 분리.
 * 없거나 파싱 실패 시 data={}, body=원문.
 */
export function splitFrontmatter(md: string): { data: Frontmatter; body: string } {
  if (!md.startsWith('---')) return { data: {}, body: md }
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(md)
  if (!m) return { data: {}, body: md }
  let data: Frontmatter = {}
  try {
    const parsed = parseYaml(m[1])
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed as Frontmatter
    }
  } catch {
    /* 잘못된 YAML은 무시하고 본문만 사용 */
  }
  return { data, body: md.slice(m[0].length) }
}

/** frontmatter `tags`(배열 또는 콤마/공백 구분 문자열) → 정규화된 태그 배열. */
export function normalizeTags(raw: unknown): string[] {
  const clean = (s: string) => s.replace(/^#/, '').trim()
  if (Array.isArray(raw)) return raw.map((x) => clean(String(x))).filter(Boolean)
  if (typeof raw === 'string') return raw.split(/[,\s]+/).map(clean).filter(Boolean)
  return []
}
