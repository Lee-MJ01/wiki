import { color, colorForType, font, radius, shadow } from '../theme/tokens'
import { useStore } from '../app/store'
import { ConnectButton } from '../components/ConnectButton'
import { useHover } from '../components/useHover'
import type { NoteFile } from '../data/types'

/**
 * 볼트 대시보드(README §5.3). Phase 0에서는 빈 상태.
 * Phase 4에서 store.files → 카드 그리드로 채운다.
 */
export function Dashboard() {
  const files = useStore((s) => s.files)

  return (
    <div style={{ padding: '30px 34px 60px', maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          fontFamily: font.serif,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: '-.01em',
          marginBottom: 4,
        }}
      >
        볼트 대시보드
      </div>
      <div style={{ fontSize: 14, color: color.textSubtle, marginBottom: 26 }}>
        G드라이브에 정리된 메모를 한눈에. 카드를 눌러 문서로 이동하세요.
      </div>

      {files.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
            gap: 16,
          }}
        >
          {files.map((f) => (
            <Card key={f.id} file={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ file }: { file: NoteFile }) {
  const open = useStore((s) => s.open)
  const { hover, hoverProps } = useHover()
  const typeCol = colorForType(file.type)

  return (
    <div
      {...hoverProps}
      onClick={() => open(file.id)}
      style={{
        background: color.card,
        border: `1px solid ${hover ? color.borderHover : color.borderSoft}`,
        borderRadius: radius.card,
        padding: 18,
        cursor: 'pointer',
        boxShadow: hover ? shadow.cardHover : shadow.card,
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 158,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <div style={{ width: 9, height: 9, borderRadius: 3, background: typeCol }} />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            letterSpacing: '.04em',
            color: typeCol,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          {file.type}
        </span>
      </div>

      <div
        style={{
          fontFamily: font.serif,
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1.25,
          marginBottom: 8,
          letterSpacing: '-.01em',
        }}
      >
        {file.title}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.5, color: color.textMuted, flex: 1 }}>
        {file.summary}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid #efe6d2',
          fontFamily: font.mono,
          fontSize: 10.5,
          color: color.textFaint,
        }}
      >
        <span>↻ {file.updatedAt}</span>
        <span>🔗 {file.links.length}</span>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        border: `1px solid ${color.borderSoft}`,
        borderRadius: 12,
        background: color.card,
        color: color.textMuted,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: color.textSecondary }}>
        아직 표시할 메모가 없습니다
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        로컬 폴더(G:\ 등)나 Google Drive를 연결하면 볼트의 메모가 카드로 나타납니다.
      </div>
      <ConnectButton />
    </div>
  )
}
