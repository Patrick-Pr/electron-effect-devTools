import { useEffect, useState } from "react"
import { StatusNotification } from "../../components/common/StatusNotification"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import type { AppView } from "./types"
import { NavigationRail } from "./NavigationRail"
import { TopBar } from "./TopBar"

interface AppShellProps {
  activeView: AppView
  onSelectView: (view: AppView) => void
  children: React.ReactNode
}

export function AppShell({ activeView, onSelectView, children }: AppShellProps) {
  const { clients: { runningState } } = useBackendSnapshot()
  const [dismissedError, setDismissedError] = useState<string | null>(null)

  useEffect(() => {
    if (!runningState.error) {
      setDismissedError(null)
    }
  }, [runningState.error])

  const currentError = !runningState.running ? runningState.error : undefined
  const visibleError = currentError !== undefined && currentError !== dismissedError

  return (
    <div className="app-shell">
      <NavigationRail activeView={activeView} onSelect={onSelectView} />
      <div className="app-frame">
        <TopBar />
        <main className="app-content">{children}</main>
        {visibleError
          ? (
            <StatusNotification
              title="Server failed to start"
              body={currentError}
              onDismiss={() => setDismissedError(currentError)}
            />
          )
          : null}
      </div>
    </div>
  )
}
