import { useEffect } from 'react'
import { color, font, radius, shadow } from '../theme/tokens'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 토큰 기반 확인 다이얼로그. Esc/오버레이 클릭=취소. */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '확인',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmColor = danger ? '#b0574a' : color.edgeHot

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(40,30,15,.28)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          maxWidth: '88vw',
          background: color.card,
          border: `1px solid ${color.border}`,
          borderRadius: radius.card,
          boxShadow: shadow.cardHover,
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            fontFamily: font.serif,
            fontSize: 17,
            fontWeight: 600,
            color: color.textStrong,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: color.textSecondary, marginBottom: 20 }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 16px',
              borderRadius: radius.button,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              color: color.textSecondary,
              background: 'transparent',
              border: `1px solid ${color.border}`,
              font: 'inherit',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 16px',
              borderRadius: radius.button,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#fff',
              background: confirmColor,
              border: `1px solid ${confirmColor}`,
              font: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
