import { color, font } from '../theme/tokens'
import { useStore } from '../app/store'
import { ConnectButton } from '../components/ConnectButton'
import { NoteCard } from '../components/NoteCard'

/** "최근 작업" 화면에 보여줄 최대 카드 수. */
const RECENT_LIMIT = 20

/**
 * 최근 작업 화면 — 수정시각이 가장 최근인 파일부터 카드 그리드로 표시한다.
 * 정렬 기준은 NoteFile.updatedMs(원본 수정시각 epoch ms) 내림차순, 상위 RECENT_LIMIT개.
 */
export function RecentView() {
  const files = useStore((s) => s.files)

  const recent = [...files].sort((a, b) => b.updatedMs - a.updatedMs).slice(0, RECENT_LIMIT)

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
        최근 작업
      </div>
      <div style={{ fontSize: 14, color: color.textSubtle, marginBottom: 26 }}>
        가장 최근에 수정한 파일부터 차례로 보여줍니다.
      </div>

      {recent.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
            gap: 16,
          }}
        >
          {recent.map((f) => (
            <NoteCard key={f.id} file={f} />
          ))}
        </div>
      )}
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
        로컬 폴더(G:\ 등)나 Google Drive를 연결하면 최근 수정한 파일이 여기에 나타납니다.
      </div>
      <ConnectButton />
    </div>
  )
}
