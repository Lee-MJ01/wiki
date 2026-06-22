import { color, colorForType, font, typeColor, NOTE_TYPES } from '../theme/tokens'
import { useStore } from '../app/store'
import { useSelectedFile } from '../app/store'

export function RightPanel() {
  const view = useStore((s) => s.view)
  const isDoc = view === 'doc'

  return (
    <aside
      style={{
        width: 286,
        flex: 'none',
        background: color.panel,
        borderLeft: `1px solid ${color.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {isDoc ? <DocPanel /> : <LegendPanel />}
    </aside>
  )
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: font.mono,
        fontSize: 11,
        letterSpacing: '.06em',
        color: color.textFaint,
        textTransform: 'uppercase',
        marginBottom: 11,
      }}
    >
      {children}
    </div>
  )
}

/**
 * 문서 뷰 우측 패널 — 목차 / 백링크 / 속성.
 * Phase 0에서는 선택 파일이 없으면 빈 상태. 실제 목차/백링크는 Phase 2~3에서 채운다.
 */
function DocPanel() {
  const file = useSelectedFile()
  const files = useStore((s) => s.files)
  const open = useStore((s) => s.open)

  if (!file) {
    return (
      <div style={{ padding: '18px 18px 26px' }}>
        <PanelHeading>목차</PanelHeading>
        <div style={{ fontSize: 12.5, color: color.textFainter, fontStyle: 'italic' }}>
          문서를 선택하면 목차·백링크·속성이 표시됩니다.
        </div>
      </div>
    )
  }

  const outline = file.blocks.filter((b) => b.type === 'h1' || b.type === 'h2')
  const backlinks = files.filter((f) => f.id !== file.id && f.links.includes(file.id))

  return (
    <div style={{ padding: '18px 18px 26px' }}>
      <PanelHeading>목차</PanelHeading>
      <div style={{ marginBottom: 26 }}>
        {outline.length === 0 ? (
          <div style={{ fontSize: 12.5, color: color.textFainter, fontStyle: 'italic' }}>—</div>
        ) : (
          outline.map((b, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: color.textSubtle,
                padding: '3px 0',
                paddingLeft: b.type === 'h2' ? 12 : 0,
                fontWeight: b.type === 'h1' ? 600 : 400,
              }}
            >
              {b.text}
            </div>
          ))
        )}
      </div>

      <PanelHeading>백링크</PanelHeading>
      <div style={{ marginBottom: 26, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {backlinks.length === 0 ? (
          <div style={{ fontSize: 12.5, color: color.textFainter, fontStyle: 'italic' }}>
            아직 연결된 메모 없음
          </div>
        ) : (
          backlinks.map((bl) => (
            <div
              key={bl.id}
              onClick={() => open(bl.id)}
              style={{
                padding: '9px 11px',
                background: color.card,
                border: `1px solid ${color.borderSoft}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: colorForType(bl.type) }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{bl.title}</span>
              </div>
              {bl.summary && (
                <div style={{ fontSize: 11.5, color: color.textMono, marginTop: 4, lineHeight: 1.4 }}>
                  {bl.summary}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <PanelHeading>속성</PanelHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5 }}>
        <Row label="유형">
          <span style={{ fontWeight: 500, color: typeColor[file.type] }}>{file.type}</span>
        </Row>
        <Row label="수정">
          <span style={{ color: color.textSecondary, fontFamily: font.mono }}>{file.updatedAt}</span>
        </Row>
        {file.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {file.tags.map((tg) => (
              <span
                key={tg}
                style={{
                  fontFamily: font.mono,
                  fontSize: 11,
                  padding: '3px 8px',
                  background: color.chipBg,
                  borderRadius: 6,
                  color: color.textMuted,
                }}
              >
                #{tg}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: color.textMono }}>{label}</span>
      {children}
    </div>
  )
}

/** 그래프·대시보드·마인드맵·다이어그램 공통 우측 패널 — 범례 + 안내. */
function LegendPanel() {
  return (
    <div style={{ padding: 18 }}>
      <PanelHeading>범례</PanelHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {NOTE_TYPES.map((name) => (
          <div
            key={name}
            style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: color.textSecondary }}
          >
            <div
              style={{ width: 11, height: 11, borderRadius: '50%', background: typeColor[name], flex: 'none' }}
            />
            {name}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          padding: 14,
          background: color.accentBox,
          border: '1px solid #ecdcbf',
          borderRadius: 10,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: color.textMuted,
        }}
      >
        글로만 된 메모는 빽빽합니다. 같은 내용을 그래프·다이어그램으로 보면 구조가 한눈에
        들어와요.
      </div>
    </div>
  )
}
