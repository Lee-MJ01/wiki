import { useState } from 'react'
import { color, font, radius } from '../theme/tokens'
import type { NoteFile } from '../data/types'

/**
 * 마크다운이 아닌 파일의 본문 렌더.
 * html=안전 렌더(샌드박스 iframe)/소스 토글, txt=원문, image=이미지, pdf=내장 뷰어.
 */
export function NonMarkdownView({ file }: { file: NoteFile }) {
  switch (file.format) {
    case 'html':
      return <HtmlView file={file} />
    case 'txt':
      return <TextView file={file} />
    case 'image':
      return <ImageView file={file} />
    case 'pdf':
      return <PdfView file={file} />
    default:
      return null
  }
}

function HtmlView({ file }: { file: NoteFile }) {
  const [mode, setMode] = useState<'render' | 'source'>('render')
  if (file.markdown == null) return <Loading />
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <ToggleBtn active={mode === 'render'} onClick={() => setMode('render')}>
          렌더
        </ToggleBtn>
        <ToggleBtn active={mode === 'source'} onClick={() => setMode('source')}>
          소스
        </ToggleBtn>
      </div>
      {mode === 'render' ? (
        <iframe
          // sandbox=""는 스크립트 실행을 막아 안전하게 마크업/스타일만 렌더한다.
          sandbox=""
          srcDoc={file.markdown}
          title={file.title}
          style={{
            width: '100%',
            height: '72vh',
            border: `1px solid ${color.border}`,
            borderRadius: 8,
            background: '#fff',
          }}
        />
      ) : (
        <Pre text={file.markdown} />
      )}
    </div>
  )
}

function TextView({ file }: { file: NoteFile }) {
  if (file.markdown == null) return <Loading />
  return <Pre text={file.markdown} />
}

function ImageView({ file }: { file: NoteFile }) {
  if (!file.objectUrl) return <Loading />
  return (
    <img
      src={file.objectUrl}
      alt={file.title}
      style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: 8,
        border: `1px solid ${color.border}`,
        background: '#fff',
      }}
    />
  )
}

function PdfView({ file }: { file: NoteFile }) {
  if (!file.objectUrl) return <Loading />
  return (
    <iframe
      src={file.objectUrl}
      title={file.title}
      style={{
        width: '100%',
        height: '80vh',
        border: `1px solid ${color.border}`,
        borderRadius: 8,
        background: '#fff',
      }}
    />
  )
}

function Pre({ text }: { text: string }) {
  return (
    <pre
      style={{
        fontFamily: font.mono,
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: color.text,
        background: color.card,
        border: `1px solid ${color.border}`,
        borderRadius: 8,
        padding: '14px 16px',
        margin: 0,
      }}
    >
      {text}
    </pre>
  )
}

function Loading() {
  return (
    <div style={{ fontSize: 14, color: color.textFaint, fontStyle: 'italic' }}>본문을 불러오는 중…</div>
  )
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        fontSize: 12.5,
        fontWeight: 600,
        borderRadius: radius.button,
        cursor: 'pointer',
        color: active ? '#fff' : color.edgeHot,
        background: active ? color.edgeHot : color.accentBox,
        border: `1px solid ${active ? color.edgeHot : '#ecdcbf'}`,
      }}
    >
      {children}
    </button>
  )
}
