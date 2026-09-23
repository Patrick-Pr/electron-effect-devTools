import { useCallback, useState } from "react"
import type { TreeNode } from "./tree-types"
import { TreeNodeRow } from "./TreeNodeRow"

interface TreeViewProps {
  nodes: TreeNode[]
  defaultExpanded?: Set<string>
}

export function TreeView({ nodes, defaultExpanded }: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded ?? new Set())

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return <div>{renderNodes(nodes, 0, expandedIds, toggle)}</div>
}

function renderNodes(
  nodes: TreeNode[],
  depth: number,
  expandedIds: Set<string>,
  toggle: (id: string) => void
): React.ReactNode[] {
  return nodes.map((node) => {
    const hasChildren = node.hasChildren ?? (node.children?.length ?? 0) > 0
    const expanded = expandedIds.has(node.id)

    return (
      <div key={node.id}>
        <TreeNodeRow
          node={node}
          depth={depth}
          expanded={expanded}
          hasChildren={hasChildren}
          onToggle={() => {
            if (!expanded) node.onExpand?.()
            toggle(node.id)
          }}
        />
        {expanded && hasChildren && (
          <div id={`tree-children-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`}>
            {renderNodes(node.children ?? [], depth + 1, expandedIds, toggle)}
          </div>
        )}
      </div>
    )
  })
}
