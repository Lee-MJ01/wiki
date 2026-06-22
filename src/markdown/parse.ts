import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { toString } from 'mdast-util-to-string'
import type { Blockquote, Image, List, Root, RootContent } from 'mdast'
import type { Block, NoteFile } from '../data/types'
import { NOTE_TYPES, type NoteType } from '../theme/tokens'
import { normalizeTags, splitFrontmatter } from './frontmatter'

const processor = unified().use(remarkParse).use(remarkGfm)

export interface ParsedMarkdown {
  typeOverride?: string
  tags: string[]
  summary: string
  blocks: Block[]
  linkTargets: string[]
}

/** 마크다운 문자열 → 프론트매터 메타 + 렌더 블록 + 위키링크 타깃. */
export function parseMarkdown(md: string): ParsedMarkdown {
  const { data, body } = splitFrontmatter(md)
  const tree = processor.parse(body) as Root
  const blocks = nodesToBlocks(tree.children)
  const tags = normalizeTags(data.tags)
  const summary =
    typeof data.summary === 'string' && data.summary.trim()
      ? data.summary.trim()
      : firstParagraph(blocks)
  const typeOverride = typeof data.type === 'string' ? data.type.trim() : undefined
  return { typeOverride, tags, summary, blocks, linkTargets: extractLinkTargets(body) }
}

/**
 * 파싱 결과를 기존 NoteFile 메타 위에 합쳐 완성된 NoteFile 생성.
 * resolveLink: 위키링크 타깃 문자열 → 파일 id(없으면 null).
 */
export function buildNoteFromMarkdown(
  base: NoteFile,
  md: string,
  resolveLink: (target: string) => string | null,
): NoteFile {
  const p = parseMarkdown(md)
  const type: NoteType =
    p.typeOverride && (NOTE_TYPES as string[]).includes(p.typeOverride)
      ? (p.typeOverride as NoteType)
      : base.type
  const links = Array.from(
    new Set(
      p.linkTargets
        .map(resolveLink)
        .filter((id): id is string => !!id && id !== base.id),
    ),
  )
  return {
    ...base,
    type,
    tags: p.tags.length ? p.tags : base.tags,
    summary: p.summary || base.summary,
    blocks: p.blocks,
    links,
    markdown: md,
  }
}

/** 위키링크 타깃을 파일 목록의 제목과 매칭해 id로 해석. */
export function resolveTargetIn(files: NoteFile[], target: string, selfId: string): string | null {
  const norm = target.replace(/\.md$/i, '').trim().toLowerCase()
  const hit = files.find((f) => f.id !== selfId && f.title.toLowerCase() === norm)
  return hit?.id ?? null
}

// ---------------- 내부 변환 ----------------

function nodesToBlocks(nodes: RootContent[]): Block[] {
  const out: Block[] = []
  for (const node of nodes) {
    const b = nodeToBlock(node)
    if (Array.isArray(b)) out.push(...b)
    else if (b) out.push(b)
  }
  return out
}

function nodeToBlock(node: RootContent): Block | Block[] | null {
  switch (node.type) {
    case 'heading':
      return { type: node.depth === 1 ? 'h1' : 'h2', text: toString(node) }
    case 'thematicBreak':
      return { type: 'divider' }
    case 'blockquote':
      return blockquoteToBlock(node)
    case 'list':
      return listToBlocks(node)
    case 'paragraph': {
      const img = node.children.find((c): c is Image => c.type === 'image')
      const onlyImage =
        !!img &&
        node.children.every(
          (c) => c.type === 'image' || (c.type === 'text' && !c.value.trim()),
        )
      if (onlyImage) return { type: 'img', label: img.alt || img.title || '' }
      const text = toString(node)
      return text.trim() ? { type: 'p', text } : null
    }
    case 'code':
      // 코드블록은 Phase 5(mermaid 등)에서 전용 처리. 지금은 본문 단락으로.
      return node.value.trim() ? { type: 'p', text: node.value } : null
    default: {
      const text = toString(node)
      return text.trim() ? { type: 'p', text } : null
    }
  }
}

/** Obsidian 콜아웃(`> [!type] 제목`) 감지 → callout, 아니면 quote. */
function blockquoteToBlock(node: Blockquote): Block {
  const full = toString(node)
  const lines = full.split('\n')
  const m = /^\s*\[!([^\]]+)\]\s*(.*)$/.exec(lines[0] ?? '')
  if (m) {
    const title = (m[2].trim() || m[1].trim())
    const body = lines.slice(1).join('\n').trim()
    return { type: 'callout', title, text: body || title }
  }
  return { type: 'quote', text: full }
}

/**
 * 체크박스 항목은 todo로, 일반 항목은 list로.
 * 한 mdast list에 둘이 섞여 있어도(인접 목록 병합 등) 순서를 보존해 분리한다.
 */
function listToBlocks(node: List): Block | Block[] {
  const out: Block[] = []
  let pending: string[] = []
  const flush = () => {
    if (pending.length) {
      out.push({ type: 'list', items: pending.slice() })
      pending = []
    }
  }
  for (const it of node.children) {
    if (it.checked != null) {
      flush()
      out.push({ type: 'todo', done: it.checked === true, text: toString(it).trim() })
    } else {
      const text = toString(it).trim()
      if (text) pending.push(text)
    }
  }
  flush()
  return out.length === 1 ? out[0] : out
}

function firstParagraph(blocks: Block[]): string {
  const p = blocks.find((b) => b.type === 'p')
  return (p?.text ?? '').slice(0, 140)
}

/** 본문에서 `[[위키링크]]` 및 마크다운 `](경로.md)` 타깃 추출. */
function extractLinkTargets(md: string): string[] {
  const out = new Set<string>()
  const wiki = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m: RegExpExecArray | null
  while ((m = wiki.exec(md))) out.add(m[1].trim())
  const mdLink = /\]\(([^)]+\.md)\)/gi
  while ((m = mdLink.exec(md))) {
    const base = m[1].split('/').pop() ?? m[1]
    out.add(decodeURIComponent(base))
  }
  return Array.from(out)
}
