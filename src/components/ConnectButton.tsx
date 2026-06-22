import { color, radius } from '../theme/tokens'
import { useStore } from '../app/store'
import { connectSource, refresh } from '../data/controller'
import { isFileSystemAccessSupported } from '../data/FileSystemSource'

/**
 * 데이터 소스 연결/새로고침 UI.
 * 미연결: 로컬 폴더 / Google Drive 두 가지 소스 버튼.
 * 연결됨: 새로고침 버튼.
 */
export function ConnectButton() {
  const connected = useStore((s) => s.connected)
  const refreshing = useStore((s) => s.refreshing)

  if (connected) {
    return (
      <button onClick={() => refresh()} disabled={refreshing} style={primaryBtn(refreshing)}>
        {refreshing ? '불러오는 중…' : '새로고침'}
      </button>
    )
  }

  const localSupported = isFileSystemAccessSupported()

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
      <button
        onClick={() => connectSource('local')}
        disabled={refreshing || !localSupported}
        style={primaryBtn(refreshing || !localSupported)}
        title={
          localSupported
            ? 'PC에 설치된 Drive 폴더(G:\\ 등)를 선택합니다. Chrome/Edge 전용.'
            : '이 브라우저는 로컬 폴더 접근을 지원하지 않습니다. Chrome/Edge를 사용하세요.'
        }
      >
        📁 로컬 폴더 선택
      </button>
      <button
        onClick={() => connectSource('drive')}
        disabled={refreshing}
        style={secondaryBtn(refreshing)}
        title="Google Drive에 OAuth로 연결합니다."
      >
        ☁ Google Drive
      </button>
    </div>
  )
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: '9px 16px',
    borderRadius: radius.button,
    fontSize: 13,
    fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    color: '#fff',
    background: color.edgeHot,
    border: 'none',
    opacity: busy ? 0.6 : 1,
  }
}

function secondaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: '9px 16px',
    borderRadius: radius.button,
    fontSize: 13,
    fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    color: color.edgeHot,
    background: color.accentBox,
    border: '1px solid #ecdcbf',
    opacity: busy ? 0.6 : 1,
  }
}
