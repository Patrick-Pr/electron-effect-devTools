import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { invokePreviewAction } from "../../mocks/actions"
import { breakpointState } from "../../mocks/debug"

const nodes: TreeNodeData[] = [
  {
    id: "pause-on-defect",
    label: `${breakpointState.pauseOnDefects ? "☑" : "☐"} Pause debug on defects`,
    icon: "",
    actions: [{ id: "toggle-pause", label: "Toggle pause on defects", icon: "↺", onSelect: () => invokePreviewAction("breakpoint:toggle") }]
  },
  ...breakpointState.values.map((value) => ({
    id: value.id,
    label: `${value.name}:`,
    description: value.value,
    icon: "◆",
    children: value.children?.map((child) => ({ id: child.id, label: `${child.name}:`, description: child.value, monoDescription: true, icon: "·" }))
  }))
]

export function BreakpointsView() {
  return <TreeView nodes={nodes} />
}
