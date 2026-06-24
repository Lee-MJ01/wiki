import { color, radius } from '../theme/tokens'
import { useStore } from '../app/store'
import { connectSource } from '../data/controller'
import { isFileSystemAccessSupported } from '../data/FileSystemSource'

/**
 * 볼트 소스 선택 버튼 두 개(로컬 폴더 / Google Drive).
 * 미연결 빈 상태와 "다시 선택" 양쪽에서 재사용한다. 클릭 시 해당 소스로 (재)연결한다.
 */
export function SourcePicker() {
  const refreshing = useStore((s) => s.refreshing)
  const localSupported = isFileSystemAccessSupported()

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
    padding: '8px 14px',
    borderRadius: radius.button,
    fontSize: 12.5,
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
    padding: '8px 14px',
    borderRadius: radius.button,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    color: color.edgeHot,
    background: color.accentBox,
    border: '1px solid #ecdcbf',
    opacity: busy ? 0.6 : 1,
  }
}
