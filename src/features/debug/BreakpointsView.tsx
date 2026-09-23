import { EmptyState } from "../../components/common/EmptyState"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { BreakpointRecord } from "../../lib/contracts/debug"
import { variableNodes } from "./debug-tree-utils"

export function BreakpointsView({ breakpoints, attached }: { breakpoints: BreakpointRecord; attached: boolean }) {
  const nodes = variableNodes(breakpoints.values, "breakpoint")
  return (
    <section className="flex flex-col min-h-0" aria-label="Breakpoints">
      <PanelHeader title="Breakpoints">
        <button
          type="button"
          className="border border-border rounded-sm bg-transparent text-primary text-xs px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-default"
          aria-pressed={breakpoints.pauseOnDefects}
          disabled={!attached}
          onClick={() => { void window.electronAPI.dispatch({ type: "debug:breakpoints:toggle-pause-on-defects" }) }}
        >
          {breakpoints.pauseOnDefects ? "☑" : "☐"} Pause on defects
        </button>
      </PanelHeader>
      <div className="flex-1 overflow-auto">
        {nodes.length > 0 ? <TreeView nodes={nodes} /> : <EmptyState title="No defect values" description="Values captured by a pause-on-defect breakpoint appear here" />}
      </div>
    </section>
  )
}
