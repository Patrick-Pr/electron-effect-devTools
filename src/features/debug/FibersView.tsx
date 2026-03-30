import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { fibers } from "../../mocks/debug"
import { invokePreviewAction } from "../../mocks/actions"

function fiberNodes(input: typeof fibers): TreeNodeData[] {
  return input.map((fiber) => ({
    id: fiber.id,
    label: `Fiber#${fiber.id}${fiber.interrupted ? " (interrupting)" : ""}${fiber.interruptible ? "" : " (uninterruptible)"}${fiber.interruptionRequested ? " (interruption requested)" : ""}`,
    description: fiber.currentSpan,
    icon: fiber.current ? "➜" : "◌",
    defaultExpanded: fiber.current,
    actions: [
      { id: `${fiber.id}-reveal`, label: "Reveal current span", icon: "↗", onSelect: () => invokePreviewAction("fiber:reveal", fiber.id) },
      { id: `${fiber.id}-interrupt`, label: "Interrupt fiber", icon: "■", onSelect: () => invokePreviewAction("fiber:interrupt", fiber.id) }
    ],
    children: [
      { id: `${fiber.id}-started`, label: "Started At", description: fiber.startedAt, icon: "·" },
      { id: `${fiber.id}-lifetime`, label: "Lifetime", description: fiber.lifetime, icon: "·" },
      { id: `${fiber.id}-interruptible`, label: "Interruptible", description: String(fiber.interruptible), icon: "·" },
      { id: `${fiber.id}-interrupted`, label: "Interrupted", description: String(fiber.interrupted), icon: "·" },
      ...fiber.attributes.map((attribute) => ({ id: attribute.id, label: `${attribute.name}:`, description: attribute.value, monoDescription: true, icon: "·" })),
      ...(fiber.children ? fiberNodes(fiber.children as typeof fibers) : [])
    ]
  }))
}

export function FibersView() {
  return <TreeView nodes={fiberNodes(fibers)} />
}
