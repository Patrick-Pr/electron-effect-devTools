import { TreeView } from "../../components/tree/TreeView"
import type { TreeNodeData } from "../../components/tree/tree-types"
import { contextTags } from "../../mocks/debug"

const variableChildren = (children: typeof contextTags[number]["children"]): TreeNodeData[] => children.map((child) => ({
  id: child.id,
  label: `${child.name}:`,
  description: child.value,
  monoDescription: true,
  icon: child.isContainer ? "▸" : "·",
  children: child.children ? variableChildren(child.children as typeof children) : undefined
}))

const nodes: TreeNodeData[] = contextTags.map((tag) => ({
  id: tag.id,
  label: `${tag.tag}:`,
  description: tag.preview,
  icon: "◇",
  children: variableChildren(tag.children),
  defaultExpanded: true
}))

export function ContextView() {
  return <TreeView nodes={nodes} />
}
