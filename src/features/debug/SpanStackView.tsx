import { EmptyState } from "../../components/common/EmptyState"
import { IconButton } from "../../components/common/IconButton"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { TreeView } from "../../components/tree/TreeView"
import type { SpanStackRecord } from "../../lib/contracts/debug"
import { variableNodes } from "./debug-tree-utils"

const LocationIcon = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13L13 3M7 3h6v6" /></svg>

export function SpanStackView({ spans, ignoreListEnabled }: { spans: SpanStackRecord[]; ignoreListEnabled: boolean }) {
  const visible = ignoreListEnabled ? spans.filter((span) => !span.ignored) : spans
  const nodes = visible.map((span) => ({
    id: `debug-span-${span.id}-${span.stackIndex}`,
    label: span.name,
    detail: span.location ? `${span.location.path}:${span.location.line}:${span.location.column}` : undefined,
    hasChildren: span.attributes.length > 0,
    children: variableNodes(span.attributes, `debug-span-${span.id}-${span.stackIndex}`),
    actions: span.location ? (
      <IconButton title={`Reveal ${span.name}`} onClick={() => { void window.electronAPI.revealLocation(span.location!) }}><LocationIcon /></IconButton>
    ) : undefined
  }))
  return (
    <section className="flex flex-col min-h-0 border-b border-border" aria-label="Span Stack">
      <PanelHeader title="Span Stack" count={visible.length || undefined}>
        <button
          type="button"
          className="border border-border rounded-sm bg-transparent text-secondary text-xs px-2 py-1 cursor-pointer"
          aria-pressed={ignoreListEnabled}
          onClick={() => { void window.electronAPI.dispatch({ type: "debug:span-stack:set-ignore-list-enabled", enabled: !ignoreListEnabled }) }}
        >
          Ignore list
        </button>
      </PanelHeader>
      <div className="flex-1 overflow-auto">
        {nodes.length > 0 ? <TreeView nodes={nodes} /> : <EmptyState title="No captured spans" description="The current span stack appears when the debugger pauses" />}
      </div>
    </section>
  )
}
