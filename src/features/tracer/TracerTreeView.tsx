import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import type { TraceSpanRecord } from "../../lib/contracts/tracer"
import { invokePreviewAction, revealPreviewLocation } from "../../mocks/actions"
import { tracerTree } from "../../mocks/tracer"

function spanChildren(span: TraceSpanRecord): TreeNodeData[] {
  const items: TreeNodeData[] = [
    { id: `${span.id}-trace`, label: "Trace ID", description: span.traceId, monoDescription: true, icon: "·" },
    { id: `${span.id}-span`, label: "Span ID", description: span.spanId, monoDescription: true, icon: "·" },
    ...span.attributes.map((attribute) => ({ id: attribute.id, label: attribute.name, description: attribute.value, monoDescription: true, icon: "·" }))
  ]

  if (span.events.length > 0) {
    items.push({
      id: `${span.id}-events`,
      label: "Events",
      icon: "⚑",
      children: span.events.map((event) => ({
        id: event.id,
        label: event.name,
        description: event.offsetLabel,
        icon: "·",
        children: event.attributes.map((attribute) => ({ id: attribute.id, label: attribute.name, description: attribute.value, monoDescription: true, icon: "·" }))
      }))
    })
  }

  if (span.children?.length) {
    items.push({
      id: `${span.id}-children`,
      label: "Child spans",
      icon: "↳",
      children: span.children.map(toTreeNode)
    })
  }

  return items
}

function toTreeNode(span: TraceSpanRecord): TreeNodeData {
  return {
    id: span.id,
    label: span.name,
    description: span.durationLabel,
    icon: span.name === "External Span" ? "⬡" : "◌",
    children: spanChildren(span),
    actions: [
      { id: `${span.id}-reset`, label: "Reset tracer", icon: "↺", onSelect: () => invokePreviewAction("tracer:reset") },
      ...(span.location
        ? [{ id: `${span.id}-reveal`, label: "Reveal span location", icon: "↗", onSelect: () => revealPreviewLocation(span.location!.path, span.location!.line, span.location!.column) }]
        : [])
    ]
  }
}

export function TracerTreeView() {
  return (
    <Panel>
      <PanelHeader
        title="Tracer"
        subtitle="Mirror the extension tree with span metadata, events, and nested child spans."
        actions={<button className="secondary-button" onClick={() => invokePreviewAction("tracer:reset")}>Reset tracer</button>}
      />
      <TreeView nodes={tracerTree.map(toTreeNode)} />
    </Panel>
  )
}
