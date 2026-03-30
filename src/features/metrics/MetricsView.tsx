import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { invokePreviewAction } from "../../mocks/actions"
import { metrics } from "../../mocks/metrics"

const nodes: TreeNodeData[] = metrics.map((metric) => ({
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

export function MetricsView() {
  return (
    <Panel>
      <PanelHeader
        title="Metrics"
        subtitle="Snapshot counters, gauges, summaries, and frequency metrics for the active client."
        actions={<button className="secondary-button" onClick={() => invokePreviewAction("metrics:reset")}>Reset metrics</button>}
      />
      <TreeView nodes={nodes} />
    </Panel>
  )
}
