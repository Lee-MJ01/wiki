import { useEffect, useMemo } from 'react'
import { color, colorForType, font } from '../theme/tokens'
import { useSelectedFile } from '../app/store'
import { loadFileContent } from '../data/controller'
import { buildHeadingTree } from '../markdown/structure'
import { layoutMindmap, type MindmapNode } from '../visualize/mindmapLayout'
import { PanZoom } from '../components/PanZoom'
import { ViewHeader } from './ViewHeader'

const H = 30

/** 마인드맵(README §5.4) — 현재 문서 머리글 계층을 좌→우 트리로. */
export function MindmapView() {
  const file = useSelectedFile()

  useEffect(() => {
    if (file && file.markdown == null) void loadFileContent(file.id)
  }, [file?.id, file?.markdown])

  const layout = useMemo(() => {
    if (!file?.markdown) return null
    return layoutMindmap(buildHeadingTree(file.markdown, file.title))
  }, [file?.markdown, file?.title])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader
        title={`마인드맵 · ${file?.title ?? '문서 미선택'}`}
        subtitle="문서의 머리글 구조를 계층으로 펼친 모습."
      />
      <div style={{ flex: 1, minHeight: 0, padding: '8px 24px 24px' }}>
        {!file ? (
          <Hint text="왼쪽에서 문서를 선택하세요." />
        ) : file.markdown == null ? (
          <Hint text="문서를 불러오는 중…" />
        ) : !layout || layout.nodes.length <= 1 ? (
          <Hint text="이 문서에는 펼칠 머리글 구조가 없습니다." />
        ) : (
          <PanZoom
            bounds={{ minX: 0, minY: -H / 2, width: layout.width, height: layout.height }}
          >
            <MindmapContent
              nodes={layout.nodes}
              edges={layout.edges}
              rootColor={colorForType(file.type)}
            />
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
      }}
    >
      {text}
    </div>
  )
}

function MindmapContent({
  nodes,
  edges,
  rootColor,
}: {
  nodes: MindmapNode[]
  edges: { x1: number; y1: number; x2: number; y2: number }[]
  rootColor: string
}) {
  return (
    <>
      {edges.map((e, i) => {
        const mx = (e.x1 + e.x2) / 2
        return (
          <path
            key={i}
            d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`}
            fill="none"
            stroke={color.edge}
            strokeWidth={1.4}
          />
        )
      })}

      {nodes.map((n) => {
        const fill = n.isRoot ? rootColor : n.isLeaf ? color.card : color.accentBox
        const stroke = n.isRoot ? rootColor : n.isLeaf ? color.borderSoft : '#e0b894'
        const textColor = n.isRoot ? '#fff' : n.isLeaf ? color.text : '#9a4f2c'
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <rect
              x={0}
              y={-H / 2}
              width={n.w}
              height={H}
              rx={9}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <text
              x={12}
              y={1}
              dominantBaseline="middle"
              fontSize={12.5}
              fontWeight={n.isRoot ? 700 : n.isLeaf ? 400 : 600}
              fill={textColor}
              fontFamily={font.sans}
            >
              {clip(n.title, n.w)}
            </text>
          </g>
        )
      })}
    </>
  )
}

/** 박스 폭에 맞춰 라벨 말줄임. */
function clip(title: string, w: number): string {
  const max = Math.floor((w - 24) / 7)
  return title.length > max ? title.slice(0, Math.max(1, max - 1)) + '…' : title
}
