import { type CSSProperties, useCallback, useState } from "react"
import type { TreeNode } from "./tree-types"

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  expanded: boolean
  hasChildren: boolean
  onToggle: () => void
}

const rowBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: "var(--row-height)",
  paddingRight: "var(--space-3)",
  cursor: "default",
  userSelect: "none",
  fontSize: "var(--font-size-sm)",
  transition: "background var(--transition-fast)"
}

const chevronStyle: CSSProperties = {
  width: 16,
  height: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  color: "var(--text-tertiary)",
  transition: "transform var(--transition-fast)"
}

const labelStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--text-primary)"
}

const detailStyle: CSSProperties = {
  marginLeft: "var(--space-2)",
  color: "var(--text-secondary)",
  fontSize: "var(--font-size-xs)",
  fontFamily: "var(--font-mono)",
  flexShrink: 0
}

export function TreeNodeRow({ node, depth, expanded, hasChildren, onToggle }: TreeNodeRowProps) {
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle()
    }
    node.onClick?.()
  }, [hasChildren, onToggle, node])

  const style: CSSProperties = {
    ...rowBase,
    paddingLeft: depth * 16 + 4,
    background: hovered ? "var(--bg-hover)" : "transparent",
    cursor: hasChildren || node.onClick ? "pointer" : "default"
  }

  return (
    <div
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <span style={{
        ...chevronStyle,
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        visibility: hasChildren ? "visible" : "hidden"
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {node.icon && <span style={{ marginRight: "var(--space-2)", display: "flex", flexShrink: 0 }}>{node.icon}</span>}
      <span style={labelStyle}>{node.label}</span>
      {node.badge && <span style={{ marginLeft: "var(--space-2)", flexShrink: 0 }}>{node.badge}</span>}
      {node.detail && <span style={detailStyle}>{node.detail}</span>}
    </div>
  )
}
