import { Badge } from "../../components/common/Badge"
import { IconButton } from "../../components/common/IconButton"
import { clients } from "../../mocks/clients"
import { invokePreviewAction } from "../../mocks/actions"

export function TopBar() {
  const activeClient = clients.find((client) => client.active)

  return (
    <header className="top-bar">
      <div>
        <p className="top-bar-kicker">Standalone preview</p>
        <h1>Effect DevTools</h1>
      </div>
      <div className="top-bar-meta">
        <Badge tone="success">Server online</Badge>
        <Badge tone="accent">{activeClient?.name ?? "No active client"}</Badge>
        <IconButton label="Start server" onClick={() => invokePreviewAction("server:start")}>▶</IconButton>
        <IconButton label="Stop server" onClick={() => invokePreviewAction("server:stop")}>■</IconButton>
      </div>
    </header>
  )
}
