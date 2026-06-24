import { useState } from 'react'
import { color, colorForType, font, radius } from '../theme/tokens'
import { useStore } from '../app/store'
import { useHover } from '../components/useHover'
import { typeForFolder } from '../data/classify'
import { createFile } from '../data/controller'
import { countFiles, type TreeNode } from '../data/vaultTree'
import type { NoteFile } from '../data/types'

/** 한 단계 들여쓰기 폭(px). */
const INDENT = 12

/**
 * 폴더 계층 트리를 재귀 렌더한다.
 * 폴더(하위 폴더 먼저)와 그 폴더 직속 파일을 깊이(depth)만큼 들여써서 구분한다.
 */
export function FolderTree({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  return (
    <>
      {node.folders.map((child) => (
        <FolderRow key={child.path} node={child} depth={depth} />
      ))}
      {node.files.map((f) => (
        <FileItem key={f.id} file={f} depth={depth} />
      ))}
    </>
  )
}

function FolderRow({ node, depth }: { node: TreeNode; depth: number }) {
  const collapsed = useStore((s) => !!s.collapsed[node.path])
  const toggleFolder = useStore((s) => s.toggleFolder)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const chipColor = colorForType(typeForFolder(node.name))

  function startCreate(e: React.MouseEvent) {
    e.stopPropagation()
    if (collapsed) toggleFolder(node.path) // 생성 시 펼침.
    setCreating(true)
    setDraft('')
  }

  function commit() {
    void createFile(node.path, draft)
    setCreating(false)
    setDraft('')
  }

  return (
    <div>
      <div
        onClick={() => toggleFolder(node.path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 8px',
          paddingLeft: 8 + depth * INDENT,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ width: 10, fontSize: 9, color: color.textFaint, flex: 'none' }}>
          {collapsed ? '▸' : '▾'}
        </span>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: chipColor, flex: 'none' }} />
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: color.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </span>
        <span
          style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textFainter, marginLeft: 'auto' }}
        >
          {countFiles(node)}
        </span>
        <button onClick={startCreate} title="새 메모" style={plusBtn}>
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
            width: `calc(100% - ${16 + depth * INDENT}px)`,
            boxSizing: 'border-box',
            margin: '2px 0 4px',
            marginLeft: 16 + depth * INDENT,
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

      {!collapsed && <FolderTree node={node} depth={depth + 1} />}
    </div>
  )
}

function FileItem({ file, depth }: { file: NoteFile; depth: number }) {
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
        padding: '7px 8px',
        paddingLeft: 12 + depth * INDENT + 17,
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
      {file.format !== 'md' && (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 9,
            color: color.textFainter,
            border: `1px solid ${color.borderSoft}`,
            borderRadius: 3,
            padding: '0 3px',
            marginLeft: 'auto',
            flex: 'none',
            textTransform: 'uppercase',
          }}
        >
          {file.ext || file.format}
        </span>
      )}
    </div>
  )
}

const plusBtn: React.CSSProperties = {
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
  flex: 'none',
}
