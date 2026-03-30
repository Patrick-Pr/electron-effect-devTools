import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { invokePreviewAction, revealPreviewLocation } from "../../mocks/actions"
import { spanStack } from "../../mocks/debug"

const nodes: TreeNodeData[] = spanStack.map((span) => span.ignored
  ? {
      id: span.id,
      label: "",
      description: "...ignored...",
      icon: "⋯",
      dimmed: true
    }
  : {
      id: span.id,
      label: span.name,
      description: span.location ? `${span.location.path}:${span.location.line}:${span.location.column}` : undefined,
      icon: span.stackIndex > 0 ? "↳" : "◉",
      children: span.attributes.map((attribute) => ({
        id: attribute.id,
        label: `${attribute.name}:`,
        description: attribute.value,
        monoDescription: true,
        icon: "·"
      })),
      actions: span.location
        ? [
            {
              id: `${span.id}-reveal`,
              label: "Reveal location",
              icon: "↗",
              onSelect: () => revealPreviewLocation(span.location!.path, span.location!.line, span.location!.column)
            },
            {
              id: `${span.id}-ignore`,
              label: "Toggle ignore",
              icon: "⊘",
              onSelect: () => invokePreviewAction("debug:toggle-ignore", span.id)
            }
          ]
        : undefined
    })

export function SpanStackView() {
  return <TreeView nodes={nodes} />
}
