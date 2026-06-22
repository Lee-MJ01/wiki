import { color, radius } from '../theme/tokens'
import { useStore, type ViewKey } from '../app/store'
import { useHover } from '../components/useHover'

const TABS: [ViewKey, string][] = [
  ['dashboard', '대시보드'],
  ['graph', '그래프'],
  ['doc', '문서'],
  ['mindmap', '마인드맵'],
  ['diagram', '다이어그램'],
]

export function ViewTabs() {
  const view = useStore((s) => s.view)
  const editing = useStore((s) => s.editing)
  const toggleEdit = useStore((s) => s.toggleEdit)

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

      {view === 'doc' && (
        <EditButton editing={editing} onClick={toggleEdit} />
      )}
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
