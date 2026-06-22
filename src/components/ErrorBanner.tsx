import { useStore } from '../app/store'

/** 연결/로드 오류 표시 배너. 닫으면 사라짐. */
export function ErrorBanner() {
  const error = useStore((s) => s.error)
  const setError = useStore((s) => s.setError)
  if (!error) return null

  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 18px',
        background: '#f7e2d6',
        borderBottom: '1px solid #e6c3ad',
        color: '#8a3d22',
        fontSize: 12.5,
      }}
    >
      <span style={{ flex: 1 }}>⚠ {error}</span>
      <button
        onClick={() => setError(null)}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#8a3d22',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
        }}
        title="닫기"
      >
        ✕
      </button>
    </div>
  )
}
