import { Badge } from "../../components/common/Badge"
import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { clients, runningState } from "../../mocks/clients"
import { invokePreviewAction } from "../../mocks/actions"

const nodes: TreeNodeData[] = [
  {
    id: "server-state",
    label: runningState.message,
    description: "Preview transport ready",
    icon: runningState.running ? "●" : "○"
  },
  ...clients.map((client) => ({
    id: `client-${client.id}`,
    label: client.name,
    description: `${client.transport} • pid ${client.pid} • ${client.lastSeen}`,
    icon: client.active ? "◉" : "○",
    actions: [
      { id: `select-${client.id}`, label: "Select client", icon: "↗", onSelect: () => invokePreviewAction("client:select", client.id) }
    ]
  }))
]

export function ClientsView() {
  return (
    <Panel>
      <PanelHeader
        title="Clients"
        subtitle="Inspect connected runtimes and swap the active source for all devtools surfaces."
        actions={<><Badge tone="success">3 connected</Badge><Badge>Port 34437</Badge></>}
      />
      <TreeView nodes={nodes} />
    </Panel>
  )
}
