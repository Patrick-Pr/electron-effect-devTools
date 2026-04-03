import { useMemo, useState } from "react"
import { AppShell } from "./features/shell/AppShell"
import type { AppView } from "./features/shell/types"
import { ClientsView } from "./features/clients/ClientsView"
import { MetricsView } from "./features/metrics/MetricsView"
import { TracerTreeView } from "./features/tracer/TracerTreeView"
import { TracerTimelineView } from "./features/tracer/TracerTimelineView"
import { BackendProvider } from "./lib/backend/BackendProvider"

export default function App() {
  const [activeView, setActiveView] = useState<AppView>("clients")

  const content = useMemo(() => {
    switch (activeView) {
      case "clients":
        return <ClientsView />
      case "tracer":
        return <TracerTreeView />
      case "timeline":
        return <TracerTimelineView />
      case "metrics":
        return <MetricsView />
    }
  }, [activeView])

  return (
    <BackendProvider>
      <AppShell activeView={activeView} onSelectView={setActiveView}>
        {content}
      </AppShell>
    </BackendProvider>
  )
}
