import type { TreeNode } from '../markdown/structure'

export interface MindmapNode {
  id: string
  title: string
  x: number
  y: number
  w: number
  depth: number
  isRoot: boolean
  isLeaf: boolean
}
export interface MindmapEdge {
  x1: number
  y1: number
  x2: number
  y2: number
}
export interface MindmapLayout {
  nodes: MindmapNode[]
  edges: MindmapEdge[]
  width: number
  height: number
}

const COL = 220
const ROW = 36
const H = 30

function nodeWidth(title: string, isRoot: boolean): number {
  const w = Math.round(title.length * 7.2 + 28)
  return Math.max(isRoot ? 120 : 70, Math.min(w, 230))
}

/** 좌→우 트리 레이아웃(리프 순서로 y 배분, 부모는 자식 중앙). */
export function layoutMindmap(root: TreeNode): MindmapLayout {
  const nodes: MindmapNode[] = []
  const pos = new Map<string, { x: number; y: number; w: number }>()
  const edges: MindmapEdge[] = []
  let leafCursor = 0

  function walk(node: TreeNode, depth: number): number {
    const x = depth * COL
    const w = nodeWidth(node.title, depth === 0)
    let y: number
    if (node.children.length === 0) {
      y = leafCursor * ROW
      leafCursor++
    } else {
      const ys = node.children.map((c) => walk(c, depth + 1))
      y = (ys[0] + ys[ys.length - 1]) / 2
    }
    pos.set(node.id, { x, y, w })
    nodes.push({
      id: node.id,
      title: node.title,
      x,
      y,
      w,
      depth,
      isRoot: depth === 0,
      isLeaf: node.children.length === 0,
    })
    return y
  }
  walk(root, 0)

  // 부모 우측 가장자리 → 자식 좌측 가장자리 곡선.
  function link(node: TreeNode) {
    const a = pos.get(node.id)!
    for (const c of node.children) {
      const b = pos.get(c.id)!
      edges.push({ x1: a.x + a.w, y1: a.y, x2: b.x, y2: b.y })
      link(c)
    }
  }
  link(root)

  const maxX = Math.max(...nodes.map((n) => n.x + n.w))
  const maxY = Math.max(...nodes.map((n) => n.y))
  return { nodes, edges, width: maxX + 20, height: maxY + H }
}
