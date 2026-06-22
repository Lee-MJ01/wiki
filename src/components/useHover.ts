import { useState } from 'react'

/**
 * 인라인 스타일 기반 hover 처리.
 * 프로토타입의 `style-hover`(dc-runtime 전용)를 React에서 재현하기 위한 헬퍼.
 * 인라인 스타일은 CSS `:hover`보다 우선하므로, hover 상태를 JS로 관리해 병합한다.
 */
export function useHover() {
  const [hover, setHover] = useState(false)
  return {
    hover,
    hoverProps: {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    },
  }
}
