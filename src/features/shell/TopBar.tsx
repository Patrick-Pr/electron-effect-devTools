import { Badge } from "../../components/common/Badge"
import { IconButton } from "../../components/common/IconButton"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { invokePreviewAction } from "../../mocks/actions"

export function TopBar() {
  const { appName, clients: clientsState } = useBackendSnapshot()
  const activeClient = clientsState.clients.find((client) => client.active)
  const { runningState } = clientsState

  return (
    <header className="top-bar">
      <div>
        <p className="top-bar-kicker">Electron runtime</p>
        <h1>{appName}</h1>
      </div>
      <div className="top-bar-meta">
        <Badge tone={runningState.running ? "success" : "warning"}>{runningState.running ? "Server online" : "Server stopped"}</Badge>
        <Badge tone="accent">{activeClient?.name ?? "No active client"}</Badge>
        <IconButton label="Start server" onClick={() => invokePreviewAction({ type: "server:start" })}>▶</IconButton>
        <IconButton label="Stop server" onClick={() => invokePreviewAction({ type: "server:stop" })}>■</IconButton>
      </div>
    </header>
  )
}
