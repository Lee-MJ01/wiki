import { useState } from 'react'
import { color, colorForType, font, radius } from '../theme/tokens'
import { useStore } from '../app/store'
import { useHover } from '../components/useHover'
import { ConnectButton } from '../components/ConnectButton'
import { typeForFolder } from '../data/classify'
import { createFile } from '../data/controller'
import type { NoteFile } from '../data/types'

/** 사이드바에 노출할 폴더 순서. 실제 폴더는 Drive 구조에서 채워진다(Phase 1). */
const FOLDER_ORDER = ['프로젝트', '회의·의사결정', 'AI 설정', '할 일', '기록']

export function Sidebar() {
  const files = useStore((s) => s.files)

  // 폴더 순서대로 그룹핑하되, 알려지지 않은 폴더는 뒤에 덧붙인다.
  const known = FOLDER_ORDER.filter((name) => files.some((f) => f.folder === name))
  const extras = Array.from(new Set(files.map((f) => f.folder))).filter(
    (name) => !FOLDER_ORDER.includes(name),
  )
  const folderNames = [...known, ...extras]

  return (
    <aside
      style={{
        width: 252,
        flex: 'none',
        background: color.panel,
        borderRight: `1px solid ${color.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '14px 16px 10px',
          fontFamily: font.mono,
          fontSize: 11,
          letterSpacing: '.08em',
          color: color.textFaint,
          textTransform: 'uppercase',
        }}
      >
        볼트
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {files.length === 0 ? (
          <div style={{ padding: '12px' }}>
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: color.textFainter,
                fontStyle: 'italic',
              }}
            >
              아직 볼트가 비어 있습니다. 로컬 폴더나 Google Drive를 연결하면 폴더·파일이
              여기에 표시됩니다.
            </div>
            <ConnectButton />
          </div>
        ) : (
          folderNames.map((name) => (
            <FolderGroup
              key={name}
              name={name}
              files={files.filter((f) => f.folder === name)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function FolderGroup({ name, files }: { name: string; files: NoteFile[] }) {
  const chipColor = colorForType(typeForFolder(name))
  const collapsed = useStore((s) => !!s.collapsed[name])
  const toggleFolder = useStore((s) => s.toggleFolder)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')

  function startCreate(e: React.MouseEvent) {
    e.stopPropagation()
    if (collapsed) toggleFolder(name) // 생성 시 펼침
    setCreating(true)
    setDraft('')
  }

  function commit() {
    void createFile(name, draft)
    setCreating(false)
    setDraft('')
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => toggleFolder(name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 8px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            width: 10,
            fontSize: 9,
            color: color.textFaint,
            flex: 'none',
            transition: 'transform .12s',
          }}
        >
          {collapsed ? '▸' : '▾'}
        </span>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: chipColor, flex: 'none' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: color.textSecondary }}>{name}</span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            color: color.textFainter,
            marginLeft: 'auto',
          }}
        >
          {files.length}
        </span>
        <button
          onClick={startCreate}
          title="새 메모"
          style={{
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: color.textFaint,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      {!collapsed && creating && (
        <input
          autoFocus
          value={draft}
          placeholder="새 메모 이름…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') {
              setCreating(false)
              setDraft('')
            }
          }}
          onBlur={() => {
            setCreating(false)
            setDraft('')
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            margin: '2px 0 4px',
            padding: '6px 10px',
            fontSize: 13,
            color: color.text,
            background: color.focusBg,
            border: `1px solid ${color.borderHover}`,
            borderRadius: radius.chip,
            outline: 'none',
          }}
        />
      )}

      {!collapsed && files.map((f) => <FileItem key={f.id} file={f} />)}
    </div>
  )
}

function FileItem({ file }: { file: NoteFile }) {
  const selectedId = useStore((s) => s.selectedId)
  const open = useStore((s) => s.open)
  const { hover, hoverProps } = useHover()
  const selected = selectedId === file.id
  const active = selected || hover

  return (
    <div
      {...hoverProps}
      onClick={() => open(file.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 8px 7px 12px',
        borderRadius: radius.chip,
        cursor: 'pointer',
        color: selected ? color.textStrong : color.textSecondary,
        fontWeight: selected ? 600 : 400,
        background: active ? color.selectedBg : 'transparent',
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: colorForType(file.type),
          flex: 'none',
        }}
      />
      <span
        style={{
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {file.title}
      </span>
    </div>
  )
}
