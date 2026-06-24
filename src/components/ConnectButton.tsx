import { color, radius } from '../theme/tokens'
import { useStore } from '../app/store'
import { reopenVault } from '../data/controller'
import { SourcePicker } from './SourcePicker'

/**
 * 미연결/빈 볼트 상태의 연결 블록.
 * 새로고침으로 복원 대기 중(restorable)이면 "이전 볼트 다시 열기" 버튼을 먼저 보여주고,
 * 그 아래에 소스 선택 버튼(로컬/Drive)을 둔다.
 */
export function ConnectButton() {
  const restorable = useStore((s) => s.restorable)
  const refreshing = useStore((s) => s.refreshing)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
      {restorable && (
        <button
          onClick={() => reopenVault()}
          disabled={refreshing}
          style={{
            padding: '9px 16px',
            borderRadius: radius.button,
            fontSize: 13,
            fontWeight: 600,
            cursor: refreshing ? 'default' : 'pointer',
            color: '#fff',
            background: color.edgeHot,
            border: 'none',
            opacity: refreshing ? 0.6 : 1,
            textAlign: 'left',
          }}
          title="새로고침 전에 쓰던 볼트를 다시 엽니다."
        >
          📂 이전 볼트 다시 열기 · {restorable.label}
        </button>
      )}
      <SourcePicker />
    </div>
  )
}
