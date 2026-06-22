import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { toString } from 'mdast-util-to-string'
import type { List, Root } from 'mdast'
import { splitFrontmatter } from './frontmatter'

const processor = unified().use(remarkParse).use(remarkGfm)

export interface TreeNode {
  id: string
  title: string
  children: TreeNode[]
}

/**
 * 마크다운의 머리글(h1→h2→…) 계층으로 트리 구성(README §5.4 마인드맵).
 * 머리글이 없는 섹션엔 상위 1단계 리스트 항목을 리프로 붙여 풍성하게 한다.
 */
export function buildHeadingTree(markdown: string, fallbackTitle: string): TreeNode {
  const { body } = splitFrontmatter(markdown)
  const tree = processor.parse(body) as Root

  let counter = 0
  const id = () => 'mm' + counter++
  const root: TreeNode = { id: id(), title: fallbackTitle, children: [] }
  const stack: { node: TreeNode; depth: number }[] = [{ node: root, depth: 0 }]
  let current = root

  for (const n of tree.children) {
    if (n.type === 'heading') {
      const depth = n.depth
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop()
      const node: TreeNode = { id: id(), title: toString(n) || '(제목 없음)', children: [] }
      stack[stack.length - 1].node.children.push(node)
      stack.push({ node, depth })
      current = node
    } else if (n.type === 'list') {
      const list = n as List
      for (const it of list.children.slice(0, 8)) {
        const t = toString(it).trim()
        if (t) current.children.push({ id: id(), title: t.slice(0, 60), children: [] })
      }
    }
  }

  // 최상위에 h1 하나만 있으면 그것을 루트로(제목 중복 방지).
  if (root.children.length === 1) return root.children[0]
  return root
}
