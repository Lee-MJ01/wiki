/**
 * 디자인 토큰 — README §8 + `노트 렌즈.dc.html` 프로토타입에서 추출.
 * 종이 톤(paper)의 차분한 팔레트. 모든 컴포넌트는 하드코딩 대신 이 토큰을 참조한다.
 */

export const color = {
  // 표면(surface)
  bgApp: '#efe7d6',
  panel: '#f3ecdb',
  bar: '#f7f1e3',
  card: '#fffdf7',
  accentBox: '#fbf2e0',
  chipBg: '#ece1c9',
  selectedBg: '#eadfc6',
  focusBg: '#fbf3df',

  // 보더
  border: '#e2d6bd',
  borderSoft: '#e7dcc4',
  borderHover: '#cdbfa0',

  // 텍스트
  text: '#3a342b',
  textStrong: '#2c2620',
  textSecondary: '#5b5346',
  textMuted: '#7a705e',
  textSubtle: '#857a66',
  textFaint: '#a3957a',
  textFainter: '#b3a589',
  textMono: '#9c8e72',

  // 상태
  success: '#7da06a',

  // 시각화
  edge: '#cdbfa6',
  edgeHot: '#c4663d',
  mindmapCurve: '#cdbfa6',
  mindmapCurveSoft: '#ddd0b4',
} as const

/** 콘텐츠 유형 → 색. 폴더명/frontmatter `type:` 으로 매핑한다(README §5.1). */
export const typeColor = {
  '프로젝트': '#c4663d',
  '의사결정': '#a8843a',
  'AI 설정': '#6d7e84',
  '할 일': '#b0574a',
  '기록': '#998a72',
} as const

export type NoteType = keyof typeof typeColor

export const NOTE_TYPES = Object.keys(typeColor) as NoteType[]

export const font = {
  serif: "'Spectral', serif",
  sans: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const

export const radius = {
  input: '9px',
  button: '8px',
  card: '12px',
  chip: '6px',
  colorChip: '3px',
} as const

export const shadow = {
  card: '0 1px 2px rgba(80,60,20,.04)',
  cardHover: '0 6px 18px rgba(120,90,30,.10)',
  toolbar: '0 3px 12px rgba(120,90,30,.08)',
} as const

/** 유형색을 안전하게 조회(미정의 유형은 '기록' 색으로 폴백). */
export function colorForType(type: string): string {
  return (typeColor as Record<string, string>)[type] ?? typeColor['기록']
}
