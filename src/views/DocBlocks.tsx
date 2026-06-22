import { type ReactNode, useMemo } from 'react'
import { color, font } from '../theme/tokens'
import { useStore } from '../app/store'
import type { Block, NoteFile } from '../data/types'

type RenderText = (text: string) => ReactNode

/** 파싱된 블록 배열을 읽기 전용으로 렌더(README §5.6). 편집은 Phase 6. */
export function DocBlocks({ blocks }: { blocks: Block[] }) {
  const files = useStore((s) => s.files)
  const open = useStore((s) => s.open)
  const renderText: RenderText = (text) => <InlineText text={text} files={files} onOpen={open} />
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} renderText={renderText} />
      ))}
    </>
  )
}

function BlockView({ block, renderText }: { block: Block; renderText: RenderText }) {
  switch (block.type) {
    case 'h1':
      return (
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-.015em',
            lineHeight: 1.15,
            margin: '6px 0 14px',
          }}
        >
          {block.text}
        </div>
      )
    case 'h2':
      return (
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: '-.01em',
            margin: '26px 0 8px',
          }}
        >
          {block.text}
        </div>
      )
    case 'p':
      return (
        <div style={{ fontSize: 15.5, lineHeight: 1.7, color: color.text, margin: '8px 0' }}>
          {renderText(block.text ?? '')}
        </div>
      )
    case 'quote':
      return (
        <div
          style={{
            borderLeft: `3px solid ${color.edgeHot}`,
            padding: '4px 0 4px 16px',
            margin: '16px 0',
            fontFamily: font.serif,
            fontStyle: 'italic',
            fontSize: 17,
            lineHeight: 1.5,
            color: color.textSecondary,
          }}
        >
          {renderText(block.text ?? '')}
        </div>
      )
    case 'callout':
      return (
        <div
          style={{
            display: 'flex',
            gap: 12,
            margin: '16px 0',
            padding: '14px 16px',
            background: color.accentBox,
            border: '1px solid #ecdcbf',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: color.edgeHot,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              flex: 'none',
              fontFamily: font.serif,
            }}
          >
            ★
          </div>
          <div>
            {block.title && (
              <div style={{ fontWeight: 600, fontSize: 13, color: '#9a4f2c', marginBottom: 3 }}>
                {block.title}
              </div>
            )}
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: color.textSecondary }}>
              {renderText(block.text ?? '')}
            </div>
          </div>
        </div>
      )
    case 'list':
      return (
        <div style={{ margin: '10px 0' }}>
          {(block.items ?? []).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '4px 0' }}>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: color.edgeHot,
                  marginTop: 9,
                  flex: 'none',
                }}
              />
              <div style={{ fontSize: 15, lineHeight: 1.6, color: color.text, flex: 1 }}>
                {renderText(item)}
              </div>
            </div>
          ))}
        </div>
      )
    case 'todo': {
      const done = block.done === true
      return (
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '5px 0' }}>
          <div
            style={{
              width: 19,
              height: 19,
              borderRadius: 5,
              flex: 'none',
              marginTop: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#fff',
              border: `2px solid ${done ? color.success : '#cdbfa0'}`,
              background: done ? color.success : 'transparent',
            }}
          >
            {done ? '✓' : ''}
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              flex: 1,
              color: done ? color.textFaint : color.text,
              textDecoration: done ? 'line-through' : 'none',
            }}
          >
            {renderText(block.text ?? '')}
          </div>
        </div>
      )
    }
    case 'img':
      return (
        <div
          style={{
            margin: '18px 0',
            height: 200,
            borderRadius: 11,
            border: `1.5px dashed ${color.borderHover}`,
            background:
              'repeating-linear-gradient(45deg,#f7f1e3,#f7f1e3 10px,#f3ecdb 10px,#f3ecdb 20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, letterSpacing: '.05em' }}>
            [ 이미지 ]
          </div>
          {block.label && <div style={{ fontSize: 13, color: color.textSubtle }}>{block.label}</div>}
        </div>
      )
    case 'divider':
      return <div style={{ height: 1, background: color.border, margin: '22px 0' }} />
  }
}

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; target: string; label: string }

/** `[[대상]]` / `[[대상|별칭]]`을 세그먼트로 분리. */
function splitWikiLinks(text: string): Segment[] {
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const out: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) })
    out.push({ kind: 'link', target: m[1].trim(), label: (m[2] ?? m[1]).trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) })
  return out
}

/** 본문 텍스트 중 위키링크를 클릭 가능한 링크로 렌더. */
function InlineText({
  text,
  files,
  onOpen,
}: {
  text: string
  files: NoteFile[]
  onOpen: (id: string) => void
}) {
  const segments = useMemo(() => splitWikiLinks(text), [text])
  if (segments.length === 1 && segments[0].kind === 'text') return <>{text}</>
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.value}</span>
        const norm = seg.target.replace(/\.md$/i, '').toLowerCase()
        const hit = files.find((f) => f.title.toLowerCase() === norm)
        if (!hit) {
          return (
            <span key={i} style={{ color: color.textFaint }}>
              {seg.label}
            </span>
          )
        }
        return (
          <span
            key={i}
            onClick={() => onOpen(hit.id)}
            style={{ color: color.edgeHot, cursor: 'pointer', fontWeight: 500 }}
          >
            {seg.label}
          </span>
        )
      })}
    </>
  )
}
