import type { NoteFile } from './types'

/**
 * 사이드바 계층 트리 노드.
 * 파일의 path(볼트 루트 기준 폴더 경로)를 분해해 실제 폴더 구조 그대로 트리를 만든다.
 */
export interface TreeNode {
  /** 폴더 표시 이름(경로의 마지막 segment). 루트 노드는 ''. */
  name: string
  /** 볼트 루트 기준 폴더 경로(이 노드까지). 루트는 ''. */
  path: string
  /** 하위 폴더(이름 가나다 정렬). */
  folders: TreeNode[]
  /** 이 폴더 직속 파일(제목 가나다 정렬). */
  files: NoteFile[]
}

/** NoteFile 목록 → 폴더 계층 트리(루트 노드 반환). */
export function buildTree(files: NoteFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', folders: [], files: [] }
  const byPath = new Map<string, TreeNode>([['', root]])

  // 경로에 해당하는 노드를 (없으면 상위까지) 생성해 반환.
  function ensure(path: string): TreeNode {
    const hit = byPath.get(path)
    if (hit) return hit
    const segs = path.split('/')
    const node: TreeNode = {
      name: segs[segs.length - 1],
      path,
      folders: [],
      files: [],
    }
    const parent = ensure(segs.slice(0, -1).join('/'))
    parent.folders.push(node)
    byPath.set(path, node)
    return node
  }

  for (const f of files) {
    const node = f.path ? ensure(f.path) : root
    node.files.push(f)
  }

  sortNode(root)
  return root
}

/** 한 폴더 노드 이하 전체 파일 수(폴더 헤더 카운트 표시용). */
export function countFiles(node: TreeNode): number {
  return node.files.length + node.folders.reduce((sum, c) => sum + countFiles(c), 0)
}

function sortNode(node: TreeNode): void {
  node.folders.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  node.files.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  node.folders.forEach(sortNode)
}
