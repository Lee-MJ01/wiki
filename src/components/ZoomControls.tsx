import { color } from '../theme/tokens'

/** 그래프·마인드맵·다이어그램 공용 줌 컨트롤(＋/－/전체 맞춤). */
export function ZoomControls({
  onIn,
  onOut,
  onFit,
}: {
  onIn: () => void
  onOut: () => void
  onFit: () => void
}) {
  const btn: React.CSSProperties = {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: color.card,
    border: `1px solid ${color.border}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    color: color.textSecondary,
  }
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <button style={btn} onClick={onIn} title="확대">
        ＋
      </button>
      <button style={btn} onClick={onOut} title="축소">
        －
      </button>
      <button style={{ ...btn, fontSize: 13 }} onClick={onFit} title="전체 맞춤">
        ⊡
      </button>
    </div>
  )
}
