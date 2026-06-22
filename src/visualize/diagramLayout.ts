import type { Flow, FlowShape } from '../markdown/flow'

export interface DiagramNode {
  id: string
  label: string
  shape: FlowShape
  x: number // 중심 x
  y: number // 중심 y
  w: number
  h: number
}
export interface DiagramEdge {
  x1: number
  y1: number
  x2: number
  y2: number
  label?: string
}
export interface DiagramLayout {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  width: number
  height: number
}

const H = 42

function nodeW(label: string): number {
  return Math.max(96, Math.min(Math.round(label.length * 7.6 + 34), 300))
}

export function layoutFlow(flow: Flow): DiagramLayout | null {
  if (flow.kind === 'none' || flow.nodes.length === 0) return null
  return flow.kind === 'linear' ? layoutLinear(flow) : layoutLayered(flow)
}

/** 선형(세로) 배치. */
function layoutLinear(flow: Flow): DiagramLayout {
  const gapY = 72
  const ws = flow.nodes.map((n) => nodeW(n.label))
  const maxW = Math.max(...ws, 120)
  const cx = maxW / 2 + 20
  const nodes: DiagramNode[] = flow.nodes.map((n, i) => ({
    ...n,
    w: ws[i],
    h: H,
    x: cx,
    y: 36 + i * gapY,
  }))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const edges: DiagramEdge[] = []
  for (const e of flow.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (a && b) edges.push({ x1: a.x, y1: a.y + H / 2, x2: b.x, y2: b.y - H / 2, label: e.label })
  }
  return { nodes, edges, width: cx + maxW / 2 + 20, height: 36 + flow.nodes.length * gapY }
}

/** 계층(위→아래) 배치 — longest-path 레이어링(Kahn 위상정렬). */
function layoutLayered(flow: Flow): DiagramLayout {
  const ids = flow.nodes.map((n) => n.id)
  const indeg = new Map(ids.map((id) => [id, 0]))
  const succ = new Map(ids.map((id) => [id, [] as string[]]))
  for (const e of flow.edges) {
    if (indeg.has(e.to)) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)
    succ.get(e.from)?.push(e.to)
  }

  const layer = new Map(ids.map((id) => [id, 0]))
  const indegLeft = new Map(indeg)
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0)
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const s of succ.get(id) ?? []) {
      layer.set(s, Math.max(layer.get(s) ?? 0, (layer.get(id) ?? 0) + 1))
      indegLeft.set(s, (indegLeft.get(s) ?? 0) - 1)
      if ((indegLeft.get(s) ?? 0) === 0) queue.push(s)
    }
  }
  for (const id of ids) if (!order.includes(id)) order.push(id) // 사이클 잔여

  const layers = new Map<number, string[]>()
  for (const id of order) {
    const l = layer.get(id) ?? 0
    const arr = layers.get(l) ?? []
    arr.push(id)
    layers.set(l, arr)
  }

  const colW = 220
  const rowH = 84
  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]))
  const pos = new Map<string, { x: number; y: number }>()
  const nodes: DiagramNode[] = []
  let maxX = 0
  for (const [l, members] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
    members.forEach((id, i) => {
      const n = nodeMap.get(id)!
      const w = nodeW(n.label)
      const x = i * colW + colW / 2 + 20
      const y = 36 + l * rowH
      pos.set(id, { x, y })
      nodes.push({ ...n, w, h: H, x, y })
      maxX = Math.max(maxX, x + w / 2)
    })
  }
  const edges: DiagramEdge[] = []
  for (const e of flow.edges) {
    const a = pos.get(e.from)
    const b = pos.get(e.to)
    if (a && b) edges.push({ x1: a.x, y1: a.y + H / 2, x2: b.x, y2: b.y - H / 2, label: e.label })
  }
  const maxLayer = Math.max(0, ...[...layer.values()])
  return { nodes, edges, width: maxX + 20, height: 36 + maxLayer * rowH + H + 20 }
}
