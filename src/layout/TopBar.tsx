import { useEffect, useState } from 'react'
import { color, font, radius } from '../theme/tokens'
import { useStore } from '../app/store'
import { formatRelativeMs } from '../data/format'

interface TopBarProps {
  onRefresh: () => void
}

export function TopBar({ onRefresh }: TopBarProps) {
  const refreshing = useStore((s) => s.refreshing)
  const connected = useStore((s) => s.connected)
  const sourceKind = useStore((s) => s.sourceKind)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)

  // 상대시각 라벨을 주기적으로 갱신.
  const [, force] = useState(0)
  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 30_000)
    return () => clearInterval(i)
  }, [])

  const chipLabel =
    sourceKind === 'local' ? '로컬 · vault' : sourceKind === 'drive' ? 'G Drive · vault' : 'vault'
  const syncedLabel =
    lastSyncedAt == null
      ? '동기화 전'
      : Date.now() - lastSyncedAt < 60_000
        ? '방금 동기화됨'
        : `${formatRelativeMs(lastSyncedAt)} 동기화됨`

  return (
    <header
      style={{
        height: 54,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 18px',
        background: color.bar,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      {/* 로고 + 제목 + vault 칩 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: color.edgeHot,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)',
          }}
        >
          <div style={{ width: 11, height: 11, border: '2.5px solid #fff', borderRadius: '50%' }} />
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontWeight: 600,
            fontSize: 18,
            color: color.textStrong,
            letterSpacing: '-.01em',
          }}
        >
          노트 렌즈
        </div>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 11,
            color: color.textMono,
            padding: '2px 7px',
            background: color.chipBg,
            borderRadius: 5,
          }}
        >
          {chipLabel}
        </div>
      </div>

      {/* 검색창(Phase 1+에서 동작 연결) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: 340,
            maxWidth: '42vw',
            padding: '7px 12px',
            background: color.card,
            border: `1px solid ${color.border}`,
            borderRadius: radius.input,
            color: color.textMono,
          }}
        >
          <div
            style={{
              width: 13,
              height: 13,
              border: `2px solid ${color.textFainter}`,
              borderRadius: '50%',
              position: 'relative',
              flex: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 6,
                height: 2,
                background: color.textFainter,
                transform: 'rotate(45deg)',
                right: -4,
                bottom: -1,
                borderRadius: 2,
              }}
            />
          </div>
          <span style={{ fontSize: 13 }}>메모 검색…</span>
        </div>
      </div>

      {/* 동기화/새로고침 인디케이터 */}
      <SyncIndicator
        refreshing={refreshing}
        connected={connected}
        label={syncedLabel}
        onRefresh={onRefresh}
      />
    </header>
  )
}

interface SyncIndicatorProps {
  refreshing: boolean
  connected: boolean
  label: string
  onRefresh: () => void
}

function SyncIndicator({ refreshing, connected, label, onRefresh }: SyncIndicatorProps) {
  return (
    <button
      onClick={onRefresh}
      title="새로고침"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '6px 12px',
        background: color.card,
        border: `1px solid ${color.border}`,
        borderRadius: radius.input,
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      {refreshing ? (
        <span
          style={{
            width: 13,
            height: 13,
            flex: 'none',
            border: `2px solid ${color.edgeHot}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'nl-spin .8s linear infinite',
          }}
        />
      ) : (
        <span
          style={{
            width: 11,
            height: 11,
            flex: 'none',
            borderRadius: '50%',
            background: connected ? color.success : color.textFainter,
            margin: 1,
          }}
        />
      )}
      <span style={{ fontSize: 12.5, color: color.textMuted, fontWeight: 500 }}>
        {refreshing ? '동기화 중…' : connected ? label : '연결 안 됨'}
      </span>
    </button>
  )
}
