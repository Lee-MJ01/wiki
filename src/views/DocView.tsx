import { useEffect } from 'react'
import { color, colorForType, font, typeColor } from '../theme/tokens'
import { useStore, useSelectedFile } from '../app/store'
import { loadFileContent } from '../data/controller'
import { DocBlocks } from './DocBlocks'
import { EditPane } from './EditPane'
import { NonMarkdownView } from './NonMarkdownView'

/**
 * 문서 뷰(README §5.6) — 리치 렌더.
 * 본문 블록은 Phase 2 파서로 렌더, 본문 위키링크/연결 메모는 Phase 3.
 * 편집(Tiptap)은 Phase 6.
 */
export function DocView() {
  const file = useSelectedFile()
  const files = useStore((s) => s.files)
  const open = useStore((s) => s.open)
  const editing = useStore((s) => s.editing)

  // 선택 파일의 본문을 지연 로드(텍스트=markdown, 이진=objectUrl 중 하나라도 없으면 로드).
  useEffect(() => {
    if (file && file.markdown == null && file.objectUrl == null) void loadFileContent(file.id)
  }, [file?.id, file?.markdown, file?.objectUrl])

  if (!file) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: color.textMuted, lineHeight: 1.7 }}>
          왼쪽 사이드바에서 문서를 선택하거나,
          <br />
          대시보드·그래프에서 메모를 눌러 여세요.
        </div>
      </div>
    )
  }

  // 블록 첫 머리글이 h1이면 그것이 제목 역할을 하므로 별도 제목은 생략.
  const hasH1 = file.blocks[0]?.type === 'h1'
  const linked = file.links
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '34px 40px 80px' }}>
      {/* 메타 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: typeColor[file.type] }} />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '.05em',
            color: typeColor[file.type],
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          {file.type}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFainter }}>
          · {file.updatedAt}
        </span>
      </div>

      {!hasH1 && (
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
          {file.title}
        </div>
      )}

      {file.format !== 'md' ? (
        <NonMarkdownView file={file} />
      ) : editing ? (
        file.markdown == null ? (
          <div style={{ fontSize: 14, color: color.textFaint, fontStyle: 'italic' }}>
            본문을 불러오는 중…
          </div>
        ) : (
          <EditPane file={file} />
        )
      ) : file.markdown == null ? (
        <div style={{ fontSize: 14, color: color.textFaint, fontStyle: 'italic' }}>
          본문을 불러오는 중…
        </div>
      ) : file.blocks.length === 0 ? (
        <div style={{ fontSize: 14, color: color.textFaint, fontStyle: 'italic' }}>(빈 문서)</div>
      ) : (
        <DocBlocks blocks={file.blocks} />
      )}

      {/* 연결된 메모 (읽기 모드에서만) */}
      {!editing && linked.length > 0 && (
        <div style={{ marginTop: 34, paddingTop: 20, borderTop: `1px solid ${color.border}` }}>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 11,
              letterSpacing: '.06em',
              color: color.textFaint,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            연결된 메모
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {linked.map((lk) => (
              <div
                key={lk.id}
                onClick={() => open(lk.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 12px',
                  background: color.card,
                  border: `1px solid ${color.borderSoft}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: color.text,
                }}
              >
                <div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: colorForType(lk.type) }}
                />
                {lk.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
