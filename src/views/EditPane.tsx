import { useEffect, useMemo, useRef, useState } from 'react'
import { color, font, radius, shadow } from '../theme/tokens'
import type { NoteFile } from '../data/types'
import { saveFile } from '../data/controller'
import { parseMarkdown } from '../markdown/parse'
import { DocBlocks } from './DocBlocks'

type Status = 'saved' | 'dirty' | 'saving' | 'error'

/**
 * 마크다운 소스 에디터 + 디바운스 자동저장 + 라이브 미리보기(Phase 6).
 * 블록→마크다운 역직렬화의 손실 위험을 피하려 원본 마크다운을 직접 편집한다.
 */
export function EditPane({ file }: { file: NoteFile }) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(file.markdown ?? '')
  const [status, setStatus] = useState<Status>('saved')
  const savedRef = useRef(file.markdown ?? '')
  const timer = useRef<number | null>(null)

  // 문서가 바뀌면 드래프트 동기화.
  useEffect(() => {
    setDraft(file.markdown ?? '')
    savedRef.current = file.markdown ?? ''
    setStatus('saved')
  }, [file.id, file.markdown])

  // 디바운스 자동 저장(변경분만).
  useEffect(() => {
    if (draft === savedRef.current) return
    setStatus('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setStatus('saving')
      saveFile(file.id, draft)
        .then(() => {
          savedRef.current = draft
          setStatus('saved')
        })
        .catch(() => setStatus('error'))
    }, 800)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [draft, file.id])

  // 미리보기는 250ms 디바운스 후 파싱.
  const [previewSrc, setPreviewSrc] = useState(draft)
  useEffect(() => {
    const t = setTimeout(() => setPreviewSrc(draft), 250)
    return () => clearTimeout(t)
  }, [draft])
  const previewBlocks = useMemo(() => parseMarkdown(previewSrc).blocks, [previewSrc])

  // --- 텍스트 조작 헬퍼 ---
  function surround(before: string, after = before) {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    setDraft(draft.slice(0, s) + before + draft.slice(s, e) + after + draft.slice(e))
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = s + before.length
      ta.selectionEnd = e + before.length
    })
  }
  function linePrefix(prefix: string) {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const lineStart = draft.lastIndexOf('\n', s - 1) + 1
    setDraft(draft.slice(0, lineStart) + prefix + draft.slice(lineStart))
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = s + prefix.length
    })
  }
  function insert(text: string) {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    setDraft(draft.slice(0, s) + text + draft.slice(e))
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = s + text.length
    })
  }

  const tools: [string, () => void][] = [
    ['B', () => surround('**')],
    ['I', () => surround('_')],
    ['H', () => linePrefix('## ')],
    ['“', () => linePrefix('> ')],
    ['•', () => linePrefix('- ')],
    ['✓', () => linePrefix('- [ ] ')],
    ['🖼', () => insert('![](url)')],
  ]

  return (
    <div>
      {/* sticky 툴바 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 16,
          padding: '7px 10px',
          background: color.card,
          border: `1px solid ${color.border}`,
          borderRadius: 10,
          boxShadow: shadow.toolbar,
        }}
      >
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 10,
            color: color.edgeHot,
            padding: '0 8px 0 4px',
            letterSpacing: '.05em',
          }}
        >
          편집 중
        </div>
        {tools.map(([label, fn]) => (
          <button
            key={label}
            onClick={fn}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 7,
              fontSize: 14,
              color: color.textSecondary,
              cursor: 'pointer',
              fontFamily: font.serif,
              background: 'transparent',
              border: 'none',
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <StatusBadge status={status} />
      </div>

      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: 320,
          resize: 'vertical',
          fontFamily: font.mono,
          fontSize: 13.5,
          lineHeight: 1.7,
          color: color.text,
          background: color.focusBg,
          border: `1px solid ${color.border}`,
          borderRadius: radius.input,
          padding: '14px 16px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: `1px solid ${color.border}`,
        }}
      >
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '.06em',
            color: color.textFaint,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          미리보기
        </div>
        <DocBlocks blocks={previewBlocks} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { text: string; color: string; dot: boolean }> = {
    saved: { text: '자동 저장됨', color: color.success, dot: true },
    dirty: { text: '편집 중…', color: color.textMuted, dot: false },
    saving: { text: '저장 중…', color: color.textMuted, dot: false },
    error: { text: '저장 실패', color: '#b0574a', dot: false },
  }
  const s = map[status]
  return (
    <div style={{ fontSize: 11.5, color: s.color, display: 'flex', alignItems: 'center', gap: 5 }}>
      {s.dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      )}
      {s.text}
    </div>
  )
}
