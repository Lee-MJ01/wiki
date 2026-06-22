import { color, font } from '../theme/tokens'

/** 뷰 상단 제목 + 설명. 그래프/마인드맵/다이어그램 공통. */
export function ViewHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ padding: '22px 34px 0' }}>
      <div style={{ fontFamily: font.serif, fontSize: 24, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: color.textSubtle, marginTop: 2 }}>{subtitle}</div>
    </div>
  )
}

/** SVG/콘텐츠 자리표시 — Phase 2~5에서 실제 시각화로 교체. */
export function CanvasPlaceholder({ note }: { note: string }) {
  return (
    <div style={{ flex: 1, minHeight: 0, padding: '8px 24px 24px' }}>
      <div
        style={{
          height: '100%',
          minHeight: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1.5px dashed ${color.borderHover}`,
          borderRadius: 12,
          background:
            'repeating-linear-gradient(45deg,#f7f1e3,#f7f1e3 10px,#f3ecdb 10px,#f3ecdb 20px)',
          color: color.textFaint,
          fontFamily: font.mono,
          fontSize: 12,
          textAlign: 'center',
          padding: 24,
        }}
      >
        {note}
      </div>
    </div>
  )
}
