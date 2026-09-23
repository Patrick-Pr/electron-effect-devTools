import { EmptyState } from "../../components/common/EmptyState"
import { IconButton } from "../../components/common/IconButton"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { FiberRecord } from "../../lib/contracts/debug"
import type { TreeNode } from "../../components/tree/tree-types"
import { variableNodes } from "./debug-tree-utils"

const RevealIcon = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13L13 3M7 3h6v6" /></svg>
const InterruptIcon = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="10" height="10" /></svg>

function fiberNode(fiber: FiberRecord): TreeNode {
  const metadata: TreeNode[] = [
    { id: `fiber-${fiber.id}-started`, label: "Started At", detail: fiber.startedAt },
    { id: `fiber-${fiber.id}-lifetime`, label: "Lifetime", detail: fiber.lifetime },
    { id: `fiber-${fiber.id}-interruptible`, label: "Interruptible", detail: String(fiber.interruptible) },
    { id: `fiber-${fiber.id}-interrupted`, label: "Interrupted", detail: String(fiber.interrupted) }
  ]
  const state = fiber.interruptionRequested ? " (interruption requested)" : fiber.interrupted ? " (interrupting)" : fiber.interruptible ? "" : " (uninterruptible)"
  return {
    id: `fiber-${fiber.id}`,
    label: `Fiber#${fiber.id}${state}`,
    detail: fiber.currentSpan,
    icon: fiber.current ? <span aria-label="Current fiber">→</span> : undefined,
    hasChildren: true,
    children: [...metadata, ...variableNodes(fiber.attributes, `fiber-${fiber.id}`), ...(fiber.children ?? []).map(fiberNode)],
    actions: (
      <>
        {fiber.location && <IconButton title={`Reveal current span for Fiber ${fiber.id}`} onClick={() => { void window.electronAPI.revealLocation(fiber.location!) }}><RevealIcon /></IconButton>}
        <IconButton
          title={`Interrupt Fiber ${fiber.id}`}
          disabled={!fiber.interruptible || fiber.interrupted || fiber.interruptionRequested}
          onClick={() => { void window.electronAPI.dispatch({ type: "debug:fiber:interrupt", fiberId: fiber.id }) }}
          danger
        ><InterruptIcon /></IconButton>
      </>
    )
  }
}

export function FibersView({ fibers }: { fibers: FiberRecord[] }) {
  const nodes = fibers.map(fiberNode)
  return (
    <section className="flex flex-col min-h-0 border-r border-border" aria-label="Fibers">
      <PanelHeader title="Fibers" count={fibers.length || undefined} />
      <div className="flex-1 overflow-auto">
        {nodes.length > 0 ? <TreeView nodes={nodes} /> : <EmptyState title="No captured fibers" description="Live fibers appear when the debugger pauses in an instrumented Effect application" />}
      </div>
    </section>
  )
}
