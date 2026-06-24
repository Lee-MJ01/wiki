import { useMemo, useRef, useState } from 'react'
import { color, font } from '../theme/tokens'
import { useStore } from '../app/store'
import { ConnectButton } from '../components/ConnectButton'
import { SourcePicker } from '../components/SourcePicker'
import { FolderTree } from './FolderTree'
import { buildTree } from '../data/vaultTree'

/**
 * 사이드바 — 볼트의 폴더 계층 트리를 표시.
 * 폭은 오른쪽 가장자리 드래그로 조절(영속), 헤더의 "다시 선택"으로 볼트 재선택/소스 변경.
 */
export function Sidebar() {
  const files = useStore((s) => s.files)
  const connected = useStore((s) => s.connected)
  const width = useStore((s) => s.sidebarWidth)
  const setSidebarWidth = useStore((s) => s.setSidebarWidth)
  const [picking, setPicking] = useState(false)

  const tree = useMemo(() => buildTree(files), [files])

  // 드래그 리사이즈: 핸들 mousedown → window mousemove로 폭 갱신(폭 클램프·영속은 store).
  const drag = useRef<{ startX: number; startW: number } | null>(null)
  function onHandleDown(e: React.MouseEvent) {
    e.preventDefault()
    drag.current = { startX: e.clientX, startW: width }
    const onMove = (ev: MouseEvent) => {
      const d = drag.current
      if (d) setSidebarWidth(d.startW + (ev.clientX - d.startX))
    }
    const onUp = () => {
      drag.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <aside
      style={{
        position: 'relative',
        width,
        flex: 'none',
        background: color.panel,
        borderRight: `1px solid ${color.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '.08em',
            color: color.textFaint,
            textTransform: 'uppercase',
          }}
        >
          볼트
        </span>
        {connected && (
          <button
            onClick={() => setPicking((v) => !v)}
            style={reselectBtn}
            title="볼트를 다시 선택하거나 소스를 바꿉니다."
          >
            {picking ? '닫기' : '다시 선택'}
          </button>
        )}
      </div>

      {connected && picking && (
        <div style={{ padding: '0 12px 10px' }}>
          <SourcePicker />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {files.length === 0 ? (
          <div style={{ padding: '12px' }}>
            <div
              style={{ fontSize: 12.5, lineHeight: 1.5, color: color.textFainter, fontStyle: 'italic' }}
            >
              {connected
                ? '이 볼트에 표시할 파일이 없습니다.'
                : '아직 볼트가 연결되지 않았습니다. 로컬 폴더나 Google Drive를 연결하면 폴더·파일이 여기에 표시됩니다.'}
            </div>
            <ConnectButton />
          </div>
        ) : (
          <FolderTree node={tree} depth={0} />
        )}
      </div>

      {/* 드래그 리사이즈 핸들(오른쪽 가장자리). */}
      <div
        onMouseDown={onHandleDown}
        title="드래그하여 사이드바 폭 조절"
        style={{
          position: 'absolute',
          top: 0,
          right: -3,
          width: 6,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 5,
        }}
      />
    </aside>
  )
}

const reselectBtn: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: color.edgeHot,
  background: color.accentBox,
  border: '1px solid #ecdcbf',
  borderRadius: 6,
  cursor: 'pointer',
}
