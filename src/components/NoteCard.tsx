import { color, colorForType, font, radius, shadow } from '../theme/tokens'
import { useStore } from '../app/store'
import { useHover } from './useHover'
import type { NoteFile } from '../data/types'

/**
 * 메모 1개를 카드로 표시하는 공용 컴포넌트.
 * 대시보드·최근 작업 등 카드 그리드에서 공유한다.
 * 클릭 시 해당 파일을 문서 뷰로 연다.
 * @param file 표시할 메모 파일 모델
 */
export function NoteCard({ file }: { file: NoteFile }) {
  const open = useStore((s) => s.open)
  const { hover, hoverProps } = useHover()
  const typeCol = colorForType(file.type)

  return (
    <div
      {...hoverProps}
      onClick={() => open(file.id)}
      style={{
        background: color.card,
        border: `1px solid ${hover ? color.borderHover : color.borderSoft}`,
        borderRadius: radius.card,
        padding: 18,
        cursor: 'pointer',
        boxShadow: hover ? shadow.cardHover : shadow.card,
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 158,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <div style={{ width: 9, height: 9, borderRadius: 3, background: typeCol }} />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            letterSpacing: '.04em',
            color: typeCol,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          {file.type}
        </span>
      </div>

      <div
        style={{
          fontFamily: font.serif,
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1.25,
          marginBottom: 8,
          letterSpacing: '-.01em',
        }}
      >
        {file.title}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.5, color: color.textMuted, flex: 1 }}>
        {file.summary}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid #efe6d2',
          fontFamily: font.mono,
          fontSize: 10.5,
          color: color.textFaint,
        }}
      >
        <span>↻ {file.updatedAt}</span>
        <span>🔗 {file.links.length}</span>
      </div>
    </div>
  )
}
