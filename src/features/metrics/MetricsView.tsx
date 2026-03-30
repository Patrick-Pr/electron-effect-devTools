import { EmptyState } from "../../components/common/EmptyState"
import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { invokePreviewAction } from "../../mocks/actions"

export function MetricsView() {
  const { metrics } = useBackendSnapshot()

  const nodes: TreeNodeData[] = metrics.metrics.map((metric) => ({
    id: metric.id,
    label: metric.name,
    description: metric.description,
    icon: metric.kind === "Counter" ? "Σ" : metric.kind === "Gauge" ? "◔" : metric.kind === "Summary" ? "◫" : metric.kind === "Histogram" ? "▥" : "≋",
    defaultExpanded: metric.defaultExpanded,
    children: [...metric.tags, ...metric.details].map((item) => ({
      id: `${metric.id}-${item.key}`,
      label: item.key,
      description: item.value,
      monoDescription: true,
      icon: "·"
    }))
  }))

  return (
    <Panel>
      <PanelHeader
        title="Metrics"
        subtitle="Snapshot counters, gauges, summaries, and frequency metrics for the active client."
        actions={<button className="secondary-button" onClick={() => invokePreviewAction({ type: "metrics:reset" })}>Reset metrics</button>}
      />
      {nodes.length > 0 ? <TreeView nodes={nodes} /> : <EmptyState title="No metrics yet" body="Connect a client and wait for the next metrics poll to populate this panel." />}
    </Panel>
  )
}
