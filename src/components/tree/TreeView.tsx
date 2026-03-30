import { TreeNodeRow } from "./TreeNodeRow"
import type { TreeNodeData } from "./tree-types"

interface TreeViewProps {
  nodes: TreeNodeData[]
}

export function TreeView({ nodes }: TreeViewProps) {
  return (
    <div className="tree-view">
      {nodes.map((node) => <TreeNodeRow key={node.id} node={node} />)}
    </div>
  )
}
