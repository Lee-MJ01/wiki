import { color } from '../theme/tokens'
import { TopBar } from '../layout/TopBar'
import { Sidebar } from '../layout/Sidebar'
import { ViewTabs } from '../layout/ViewTabs'
import { RightPanel } from '../layout/RightPanel'
import { ViewRouter } from '../views/ViewRouter'
import { ErrorBanner } from '../components/ErrorBanner'
import { refresh } from '../data/controller'

export function App() {
  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: color.bgApp,
        overflow: 'hidden',
      }}
    >
      <TopBar onRefresh={() => refresh()} />
      <ErrorBanner />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar />

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <ViewTabs />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <ViewRouter />
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  )
}
