import { useEffect, useMemo } from 'react'
import { color, font } from '../theme/tokens'
import { useSelectedFile } from '../app/store'
import { loadFileContent } from '../data/controller'
import { buildFlow } from '../markdown/flow'
import { layoutFlow, type DiagramEdge, type DiagramNode } from '../visualize/diagramLayout'
import { PanZoom } from '../components/PanZoom'
import { ViewHeader } from './ViewHeader'

/** 자동 다이어그램(README §5.5) — 순서 리스트/mermaid → 플로우차트. */
export function DiagramView() {
  const file = useSelectedFile()

  useEffect(() => {
    if (file && file.markdown == null) void loadFileContent(file.id)
  }, [file?.id, file?.markdown])

  const layout = useMemo(() => {
    if (!file?.markdown) return null
    return layoutFlow(buildFlow(file.markdown))
  }, [file?.markdown])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader
        title="자동 다이어그램"
        subtitle="의사결정·절차가 담긴 글을 플로우차트로 자동 변환."
      />
      <div style={{ flex: 1, minHeight: 0, padding: '8px 24px 24px' }}>
        {!file ? (
          <Hint text="왼쪽에서 문서를 선택하세요." />
        ) : file.markdown == null ? (
          <Hint text="문서를 불러오는 중…" />
        ) : !layout ? (
          <Hint text="이 문서에는 순서 있는 절차(번호 목록)나 mermaid 다이어그램이 없습니다." />
        ) : (
          <PanZoom bounds={{ minX: -20, minY: -10, width: layout.width + 40, height: layout.height + 20 }}>
            <DiagramContent nodes={layout.nodes} edges={layout.edges} />
          </PanZoom>
        )}
      </div>
    </div>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color.textMuted,
        fontSize: 14,
        textAlign: 'center',
        padding: 24,
      }}
    >
      {text}
    </div>
  )
}

function DiagramContent({ nodes, edges }: { nodes: DiagramNode[]; edges: DiagramEdge[] }) {
  return (
    <>
      {edges.map((e, i) => (
        <g key={i}>
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#b3a589" strokeWidth={1.8} />
          <path d={arrowHead(e.x1, e.y1, e.x2, e.y2)} fill="none" stroke="#b3a589" strokeWidth={1.8} />
          {e.label && (
            <text
              x={(e.x1 + e.x2) / 2 + 6}
              y={(e.y1 + e.y2) / 2}
              fontSize={11}
              fill={color.textMuted}
              fontFamily={font.mono}
            >
              {e.label}
            </text>
          )}
        </g>
      ))}

      {nodes.map((n) => {
        const s = nodeStyle(n.shape)
        return (
          <g key={n.id}>
            <rect
              x={n.x - n.w / 2}
              y={n.y - n.h / 2}
              width={n.w}
              height={n.h}
              rx={n.shape === 'pill' ? n.h / 2 : 9}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={1.6}
            />
            <text
              x={n.x}
              y={n.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={500}
              fill={s.text}
              fontFamily={font.sans}
            >
              {clip(n.label, n.w)}
            </text>
          </g>
        )
      })}
    </>
  )
}

function nodeStyle(shape: DiagramNode['shape']) {
  if (shape === 'decision') return { fill: '#6d7e84', stroke: '#5a6a70', text: '#fff' }
  if (shape === 'pill') return { fill: color.accentBox, stroke: '#e0b894', text: '#9a4f2c' }
  return { fill: color.card, stroke: color.borderHover, text: color.text }
}

function arrowHead(x1: number, y1: number, x2: number, y2: number): string {
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const len = 8
  const spread = 0.5
  const ax = x2 - len * Math.cos(ang - spread)
  const ay = y2 - len * Math.sin(ang - spread)
  const bx = x2 - len * Math.cos(ang + spread)
  const by = y2 - len * Math.sin(ang + spread)
  return `M ${ax} ${ay} L ${x2} ${y2} L ${bx} ${by}`
}

function clip(label: string, w: number): string {
  const max = Math.floor((w - 20) / 7)
  return label.length > max ? label.slice(0, Math.max(1, max - 1)) + '…' : label
}
