import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { toString } from 'mdast-util-to-string'
import type { Code, List, Root } from 'mdast'
import { splitFrontmatter } from './frontmatter'

const processor = unified().use(remarkParse).use(remarkGfm)

export type FlowShape = 'rect' | 'pill' | 'decision'
export interface FlowNode {
  id: string
  label: string
  shape: FlowShape
}
export interface FlowEdge {
  from: string
  to: string
  label?: string
}
export interface Flow {
  kind: 'linear' | 'mermaid' | 'none'
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/**
 * 본문에서 플로우차트 소스 추출(README §5.5).
 * 우선순위: 1) ```mermaid 코드블록, 2) 첫 순서 리스트(1. 2. 3.) → 선형 흐름.
 */
export function buildFlow(markdown: string): Flow {
  const { body } = splitFrontmatter(markdown)
  const tree = processor.parse(body) as Root

  const mermaid = tree.children.find(
    (n): n is Code => n.type === 'code' && (n.lang || '').toLowerCase() === 'mermaid',
  )
  if (mermaid) {
    const flow = parseMermaid(mermaid.value)
    if (flow.nodes.length) return flow
  }

  const ordered = tree.children.find((n): n is List => n.type === 'list' && !!n.ordered)
  if (ordered) return linearFromList(ordered)

  return { kind: 'none', nodes: [], edges: [] }
}

function linearFromList(list: List): Flow {
  const items = list.children.map((it) => toString(it).trim()).filter(Boolean)
  const nodes: FlowNode[] = items.map((label, i) => ({
    id: 's' + i,
    label,
    shape: i === 0 || i === items.length - 1 ? 'pill' : 'rect',
  }))
  const edges: FlowEdge[] = []
  for (let i = 0; i < nodes.length - 1; i++) edges.push({ from: nodes[i].id, to: nodes[i + 1].id })
  return { kind: 'linear', nodes, edges }
}

/** 간단한 mermaid flowchart 서브셋 파서: A[..] -->|라벨| B{..} 등. */
function parseMermaid(src: string): Flow {
  const nodes = new Map<string, FlowNode>()
  const edges: FlowEdge[] = []

  const ensure = (token: string): string | null => {
    const m = /^([\w][\w-]*)\s*(\[([^\]]*)\]|\(\(([^)]*)\)\)|\(([^)]*)\)|\{([^}]*)\})?/.exec(
      token.trim(),
    )
    if (!m) return null
    const id = m[1]
    const label = m[3] ?? m[4] ?? m[5] ?? m[6]
    let shape: FlowShape = 'rect'
    if (m[2]) {
      if (m[2][0] === '{') shape = 'decision'
      else if (m[2][0] === '(') shape = 'pill'
    }
    const existing = nodes.get(id)
    if (!existing) {
      nodes.set(id, { id, label: label ?? id, shape })
    } else if (m[2]) {
      existing.label = label ?? existing.label
      existing.shape = shape
    }
    return id
  }

  for (const raw of src.split('\n')) {
    const line = raw.trim()
    if (!line || /^(graph|flowchart|subgraph|end)\b/i.test(line)) continue
    const m = /^(.+?)\s*--+>?\s*(\|([^|]*)\|)?\s*(.+)$/.exec(line)
    if (m) {
      const from = ensure(m[1])
      const to = ensure(m[4])
      if (from && to) edges.push({ from, to, label: m[3]?.trim() || undefined })
    } else {
      ensure(line)
    }
  }
  return { kind: 'mermaid', nodes: [...nodes.values()], edges }
}
