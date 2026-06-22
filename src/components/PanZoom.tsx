import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ZoomControls } from './ZoomControls'

export interface Bounds {
  minX: number
  minY: number
  width: number
  height: number
}
interface Transform {
  k: number
  x: number
  y: number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const MIN_K = 0.15
const MAX_K = 8

/**
 * SVG 콘텐츠를 감싸 휠 확대/축소·드래그 이동·전체 맞춤을 제공하는 컨테이너.
 * children은 월드 좌표로 그린 SVG 요소들(자체 <svg> 없이). bounds로 초기 맞춤.
 */
export function PanZoom({
  bounds,
  children,
  maxFitK = 1.4,
}: {
  bounds: Bounds
  children: ReactNode
  maxFitK?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [t, setT] = useState<Transform>({ k: 1, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const fitKey = useRef('')

  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function fit() {
    if (!size.w || !size.h) return
    const pad = 40
    const bw = bounds.width || 1
    const bh = bounds.height || 1
    const k = clamp(Math.min((size.w - pad * 2) / bw, (size.h - pad * 2) / bh), MIN_K, maxFitK)
    setT({
      k,
      x: size.w / 2 - k * (bounds.minX + bw / 2),
      y: size.h / 2 - k * (bounds.minY + bh / 2),
    })
  }

  // bounds가 바뀌거나 처음 크기를 얻으면 한 번 맞춤(사용자 줌/팬 보존).
  const bkey = `${bounds.minX},${bounds.minY},${bounds.width},${bounds.height}`
  useEffect(() => {
    if (!size.w) return
    if (fitKey.current.split('|')[0] !== bkey || fitKey.current === '') {
      fitKey.current = bkey + '|' + size.w + 'x' + size.h
      fit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bkey, size.w, size.h])

  // 휠 줌(네이티브 비-passive 리스너).
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * 0.0015)
      setT((prev) => {
        const k = clamp(prev.k * factor, MIN_K, MAX_K)
        const ratio = k / prev.k
        return { k, x: px - (px - prev.x) * ratio, y: py - (py - prev.y) * ratio }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function zoomBy(factor: number) {
    setT((prev) => {
      const k = clamp(prev.k * factor, MIN_K, MAX_K)
      const ratio = k / prev.k
      const cx = size.w / 2
      const cy = size.h / 2
      return { k, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio }
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(e) => {
          dragRef.current = { x: e.clientX, y: e.clientY }
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return
          const dx = e.clientX - dragRef.current.x
          const dy = e.clientY - dragRef.current.y
          dragRef.current = { x: e.clientX, y: e.clientY }
          setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
        }}
        onPointerUp={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onPointerLeave={() => {
          dragRef.current = null
          setDragging(false)
        }}
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>{children}</g>
      </svg>
      <ZoomControls onIn={() => zoomBy(1.3)} onOut={() => zoomBy(1 / 1.3)} onFit={fit} />
    </div>
  )
}
