import { EmptyState } from "../../components/common/EmptyState"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { ContextTagRecord } from "../../lib/contracts/debug"
import { variableNodes } from "./debug-tree-utils"

export function ContextView({ context }: { context: ContextTagRecord[] }) {
  const nodes = context.map((entry) => ({
    id: `context-${entry.id}`,
    label: `${entry.tag}:`,
    detail: entry.preview,
    hasChildren: entry.children.length > 0,
    children: variableNodes(entry.children, `context-${entry.id}`)
  }))
  return (
    <section className="flex flex-col min-h-0 border-r border-b border-border" aria-label="Effect Context">
      <PanelHeader title="Effect Context" count={context.length || undefined} />
      <div className="flex-1 overflow-auto">
        {nodes.length > 0 ? <TreeView nodes={nodes} /> : <EmptyState title="No captured context" description="Pause a supported Effect debug session to capture the current fiber context" />}
      </div>
    </section>
  )
}
