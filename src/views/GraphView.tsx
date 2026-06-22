import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { color, colorForType, font } from '../theme/tokens'
import { useStore } from '../app/store'
import { ViewHeader } from './ViewHeader'
import { ConnectButton } from '../components/ConnectButton'
import { ZoomControls } from '../components/ZoomControls'
import {
  computeGraphLayout,
  graphSignature,
  type GraphEdge,
  type GraphNode,
} from '../visualize/forceLayout'

/** 연결 그래프(README §5.2) — 위키링크 관계를 force 레이아웃 + 줌/팬으로 렌더. */
export function GraphView() {
  const files = useStore((s) => s.files)
  const selectedId = useStore((s) => s.selectedId)
  const open = useStore((s) => s.open)
  const linksLoading = useStore((s) => s.linksLoading)

  // 링크가 백그라운드로 스트리밍되는 동안 레이아웃이 매번 흔들리지 않도록,
  // 로딩이 끝났을 때(또는 파일 집합이 바뀔 때)만 시그니처를 커밋해 레이아웃을 재계산.
  const sig = graphSignature(files)
  const [committedSig, setCommittedSig] = useState(sig)
  useEffect(() => {
    if (!linksLoading) setCommittedSig(sig)
  }, [linksLoading, sig])
  const layout = useMemo(() => computeGraphLayout(files), [committedSig])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader
        title="연결 그래프"
        subtitle="메모 사이의 [[링크]] 관계. 휠로 확대/축소, 드래그로 이동, 노드 클릭으로 문서 열기."
      />
      <div style={{ flex: 1, minHeight: 0, padding: '8px 24px 24px', position: 'relative' }}>
        {files.length === 0 ? (
          <EmptyGraph />
        ) : (
          <GraphCanvas
            nodes={layout.nodes}
            edges={layout.edges}
            sig={committedSig}
            selectedId={selectedId}
            onOpen={open}
          />
        )}
        {linksLoading && (
          <div
            style={{
              position: 'absolute',
              left: 30,
              bottom: 30,
              padding: '5px 11px',
              background: color.card,
              border: `1px solid ${color.border}`,
              borderRadius: 8,
              fontSize: 12,
              color: color.textMuted,
            }}
          >
            링크 분석 중… (완료되면 그래프가 갱신됩니다)
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyGraph() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: color.textMuted,
      }}
    >
      <div style={{ fontSize: 14 }}>연결하면 메모 그래프가 표시됩니다.</div>
      <ConnectButton />
    </div>
  )
}

interface Transform {
  k: number
  x: number
  y: number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const MIN_K = 0.15
const MAX_K = 8

function GraphCanvas({
  nodes,
  edges,
  sig,
  selectedId,
  onOpen,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  sig: string
  selectedId: string | null
  onOpen: (id: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [t, setT] = useState<Transform>({ k: 1, x: 0, y: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const lastFit = useRef('')

  const posById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const bounds = useMemo(() => {
    const xs = nodes.map((n) => n.x ?? 0)
    const ys = nodes.map((n) => n.y ?? 0)
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    }
  }, [nodes])

  const neighbors = useMemo(() => {
    const s = new Set<string>()
    if (!selectedId) return s
    for (const e of edges) {
      if (e.source === selectedId) s.add(e.target)
      if (e.target === selectedId) s.add(e.source)
    }
    return s
  }, [edges, selectedId])

  // 컨테이너 크기 측정.
  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function fit() {
    if (!size.w || !size.h) return
    const pad = 60
    const bw = bounds.maxX - bounds.minX || 1
    const bh = bounds.maxY - bounds.minY || 1
    const k = clamp(Math.min((size.w - pad * 2) / bw, (size.h - pad * 2) / bh), MIN_K, 1.4)
    setT({
      k,
      x: size.w / 2 - k * (bounds.minX + bw / 2),
      y: size.h / 2 - k * (bounds.minY + bh / 2),
    })
  }

  // 그래프가 바뀌거나 처음 크기를 얻으면 한 번 맞춤(사용자 줌/팬은 보존).
  useEffect(() => {
    if (!size.w) return
    const key = sig + '|' + size.w + 'x' + size.h
    if (lastFit.current.split('|')[0] !== sig || lastFit.current === '') {
      lastFit.current = key
      fit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, size.w, size.h])

  // 휠 줌(React onWheel은 passive라 preventDefault 불가 → 네이티브 비-passive 리스너).
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * 0.0015)
      setT((prev) => {
        const k = clamp(prev.k * factor, MIN_K, MAX_K)
        const ratio = k / prev.k
        return { k, x: px - (px - prev.x) * ratio, y: py - (py - prev.y) * ratio }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function zoomBy(factor: number) {
    setT((prev) => {
      const k = clamp(prev.k * factor, MIN_K, MAX_K)
      const ratio = k / prev.k
      const cx = size.w / 2
      const cy = size.h / 2
      return { k, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio }
    })
  }

  const showLabel = (id: string) =>
    t.k >= 1.1 || id === selectedId || id === hoverId || neighbors.has(id)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(e) => {
          dragRef.current = { x: e.clientX, y: e.clientY }
          movedRef.current = false
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return
          const dx = e.clientX - dragRef.current.x
          const dy = e.clientY - dragRef.current.y
          if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true
          dragRef.current = { x: e.clientX, y: e.clientY }
          setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
        }}
        onPointerUp={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onPointerLeave={() => {
          dragRef.current = null
          setDragging(false)
        }}
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {edges.map((e, i) => {
            const a = posById.get(e.source)
            const b = posById.get(e.target)
            if (!a || !b) return null
            const hot = selectedId === e.source || selectedId === e.target
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? color.edgeHot : color.edge}
                strokeWidth={(hot ? 2 : 1.4) / t.k}
                strokeOpacity={hot ? 0.85 : 0.65}
              />
            )
          })}

          {nodes.map((n) => {
            const col = colorForType(n.file.type)
            const active = selectedId === n.id
            const label = showLabel(n.id)
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (!movedRef.current) onOpen(n.id)
                }}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
              >
                {active && <circle r={n.r + 7} fill={col} fillOpacity={0.16} />}
                <circle
                  r={n.r}
                  fill={col}
                  fillOpacity={active ? 1 : 0.9}
                  stroke="#f7f1e3"
                  strokeWidth={3 / t.k}
                />
                {label && (
                  // 줌과 무관하게 일정한 화면 크기로 라벨 표시(역스케일).
                  <g transform={`scale(${1 / t.k})`}>
                    <text
                      y={n.r * t.k + 14}
                      textAnchor="middle"
                      fontSize={12.5}
                      fill="#4a4339"
                      fontFamily={font.sans}
                      fontWeight={active ? 600 : 500}
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.file.title}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <ZoomControls onIn={() => zoomBy(1.3)} onOut={() => zoomBy(1 / 1.3)} onFit={fit} />
    </div>
  )
}
