import { useMemo, useState } from "react"
import { AppShell } from "./features/shell/AppShell"
import type { AppView } from "./features/shell/types"
import { ClientsView } from "./features/clients/ClientsView"
import { DebugView } from "./features/debug/DebugView"
import { MetricsView } from "./features/metrics/MetricsView"
import { TracerTimelineView } from "./features/tracer/TracerTimelineView"
import { TracerTreeView } from "./features/tracer/TracerTreeView"
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
      case "debug":
        return <DebugView />
    }
  }, [activeView])

  return <BackendProvider><AppShell activeView={activeView} onSelectView={setActiveView}>{content}</AppShell></BackendProvider>
}
