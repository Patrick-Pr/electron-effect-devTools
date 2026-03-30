import { Badge } from "../../components/common/Badge"
import { EmptyState } from "../../components/common/EmptyState"
import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { invokePreviewAction } from "../../mocks/actions"

export function ClientsView() {
  const { clients: clientsState } = useBackendSnapshot()
  const { clients, runningState } = clientsState
  const connectedClients = clients.filter((client) => client.status === "connected")
  const disconnectedClients = clients.filter((client) => client.status === "disconnected")

  const nodes: TreeNodeData[] = clients.length > 0 || runningState.running
    ? [
        {
          id: "server-state",
          label: runningState.message,
          description: runningState.error,
          icon: runningState.running ? "●" : "○",
          dimmed: !runningState.running
        },
        ...clients.map((client) => ({
          id: `client-${client.id}`,
          label: client.name,
          description: [client.transport, client.status === "disconnected" ? "disconnected" : undefined, client.lastSeen].filter(Boolean).join(" • "),
          icon: client.status === "connected"
            ? (client.active ? "◉" : "○")
            : "⊘",
          dimmed: client.status === "disconnected",
          actions: [
            {
              id: `select-${client.id}`,
              label: "Select client",
              icon: "↗",
              onSelect: () => invokePreviewAction({ type: "client:select", clientId: client.id })
            },
            {
              id: `${client.status}-${client.id}`,
              label: client.status === "connected" ? "Close connection" : "Remove client",
              icon: client.status === "connected" ? "■" : "×",
              onSelect: () => invokePreviewAction(
                client.status === "connected"
                  ? { type: "client:disconnect", clientId: client.id }
                  : { type: "client:remove", clientId: client.id }
              )
            }
          ]
        }))
      ]
    : []

  return (
    <Panel>
      <PanelHeader
        title="Clients"
        subtitle="Inspect connected runtimes and swap the active source for all devtools surfaces."
        actions={<><Badge tone={runningState.running ? "success" : "neutral"}>{connectedClients.length} connected</Badge>{disconnectedClients.length > 0 ? <Badge tone="warning">{disconnectedClients.length} disconnected</Badge> : null}<Badge>Port {runningState.port}</Badge></>}
      />
      {nodes.length > 0
        ? <TreeView nodes={nodes} />
        : <EmptyState title="Server stopped" body="Start the Effect devtools server to accept live runtime clients." actionLabel="Start server" onAction={() => invokePreviewAction({ type: "server:start" })} />}
    </Panel>
  )
}
