import { useState } from 'react'
import { color, radius } from '../theme/tokens'
import { useStore, useSelectedFile, type ViewKey } from '../app/store'
import { useHover } from '../components/useHover'
import { deleteFile } from '../data/controller'
import { ConfirmModal } from '../components/ConfirmModal'

const TABS: [ViewKey, string][] = [
  ['dashboard', '대시보드'],
  ['recent', '최근 작업'],
  ['graph', '그래프'],
  ['doc', '문서'],
  ['mindmap', '마인드맵'],
  ['diagram', '다이어그램'],
]

export function ViewTabs() {
  const view = useStore((s) => s.view)
  const editing = useStore((s) => s.editing)
  const toggleEdit = useStore((s) => s.toggleEdit)
  const selectedId = useStore((s) => s.selectedId)
  const selected = useSelectedFile()
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      style={{
        height: 50,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 18px',
        background: color.bar,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      {TABS.map(([key, label]) => (
        <Tab key={key} tabKey={key} label={label} active={view === key} />
      ))}

      <div style={{ flex: 1 }} />

      {view === 'doc' && selected?.format === 'md' && (
        <EditButton editing={editing} onClick={toggleEdit} />
      )}
      {selectedId != null && <DeleteButton onClick={() => setConfirming(true)} />}

      <ConfirmModal
        open={confirming}
        danger
        title="메모 삭제"
        message={`"${selected?.title ?? ''}" 메모를 삭제할까요? 이 동작은 되돌릴 수 없습니다(로컬 폴더는 영구 삭제, Drive는 휴지통으로 이동).`}
        confirmLabel="삭제"
        onConfirm={() => {
          if (selectedId != null) void deleteFile(selectedId)
          setConfirming(false)
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

function Tab({ tabKey, label, active }: { tabKey: ViewKey; label: string; active: boolean }) {
  const setView = useStore((s) => s.setView)
  const { hover, hoverProps } = useHover()
  return (
    <div
      {...hoverProps}
      onClick={() => setView(tabKey)}
      style={{
        padding: '7px 14px',
        borderRadius: radius.button,
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        color: active ? '#fff' : hover ? color.textStrong : color.textSubtle,
        background: active ? color.edgeHot : 'transparent',
      }}
    >
      {label}
    </div>
  )
}

function EditButton({ editing, onClick }: { editing: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: radius.button,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        color: editing ? '#fff' : color.edgeHot,
        background: editing ? color.edgeHot : color.accentBox,
        border: `1px solid ${editing ? color.edgeHot : '#ecdcbf'}`,
      }}
    >
      {editing ? '완료' : '편집'}
    </div>
  )
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  const { hover, hoverProps } = useHover()
  return (
    <div
      {...hoverProps}
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: radius.button,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        color: hover ? '#fff' : '#b0574a',
        background: hover ? '#b0574a' : 'transparent',
        border: '1px solid #d8b3a8',
      }}
    >
      삭제
    </div>
  )
}
