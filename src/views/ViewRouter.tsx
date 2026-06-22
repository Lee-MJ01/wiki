import { useStore } from '../app/store'
import { Dashboard } from './Dashboard'
import { GraphView } from './GraphView'
import { DocView } from './DocView'
import { MindmapView } from './MindmapView'
import { DiagramView } from './DiagramView'

/** 현재 view 상태에 따라 메인 콘텐츠를 전환(README §6). */
export function ViewRouter() {
  const view = useStore((s) => s.view)
  switch (view) {
    case 'dashboard':
      return <Dashboard />
    case 'graph':
      return <GraphView />
    case 'doc':
      return <DocView />
    case 'mindmap':
      return <MindmapView />
    case 'diagram':
      return <DiagramView />
  }
}
