import type { NoteType } from '../theme/tokens'

/**
 * 폴더명 → 콘텐츠 유형 매핑(README §5.1).
 * Phase 2에서 frontmatter `type:`이 있으면 그것이 우선한다.
 */
const FOLDER_TYPE: Record<string, NoteType> = {
  프로젝트: '프로젝트',
  '회의·의사결정': '의사결정',
  'AI 설정': 'AI 설정',
  '할 일': '할 일',
  기록: '기록',
}

export function typeForFolder(folder: string): NoteType {
  return FOLDER_TYPE[folder] ?? '기록'
}
