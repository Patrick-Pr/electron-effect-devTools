import { useMemo, useState } from "react"
import type { TreeNodeData } from "./tree-types"

interface TreeNodeRowProps {
  node: TreeNodeData
  depth?: number
}

export function TreeNodeRow({ node, depth = 0 }: TreeNodeRowProps) {
  const hasChildren = Boolean(node.children?.length)
  const [expanded, setExpanded] = useState(node.defaultExpanded ?? false)
  const indent = useMemo(() => ({ paddingLeft: `${12 + depth * 16}px` }), [depth])

  return (
    <div>
      <div className={`tree-row${node.dimmed ? " is-dimmed" : ""}`} style={indent}>
        <button
          className={`tree-chevron${hasChildren ? " is-visible" : ""}`}
          onClick={() => hasChildren && setExpanded((value) => !value)}
        >
          {hasChildren ? (expanded ? "⌄" : "›") : ""}
        </button>
        <span className="tree-icon">{node.icon ?? "•"}</span>
        <span className="tree-label">{node.label}</span>
        {node.description ? (
          <span className={`tree-description${node.monoDescription ? " is-mono" : ""}`}>{node.description}</span>
        ) : null}
        {node.actions?.length ? (
          <span className="tree-actions">
            {node.actions.map((action) => (
              <button key={action.id} className="tree-action-button" onClick={action.onSelect} title={action.label}>
                {action.icon}
              </button>
            ))}
          </span>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <div>
          {node.children!.map((child) => <TreeNodeRow key={child.id} node={child} depth={depth + 1} />)}
        </div>
      ) : null}
    </div>
  )
}
