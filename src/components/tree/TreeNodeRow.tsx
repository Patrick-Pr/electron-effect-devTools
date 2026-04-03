import { useCallback } from "react"
import clsx from "clsx"
import type { TreeNode } from "./tree-types"

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  expanded: boolean
  hasChildren: boolean
  onToggle: () => void
}

export function TreeNodeRow({ node, depth, expanded, hasChildren, onToggle }: TreeNodeRowProps) {
  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle()
    }
    node.onClick?.()
  }, [hasChildren, onToggle, node])

  return (
    <div
      className={clsx(
        "flex items-center h-(--row-height) pr-3 select-none text-sm",
        "transition-[background] duration-(--transition-fast)",
        "hover:bg-subtle-hover",
        (hasChildren || node.onClick) ? "cursor-pointer" : "cursor-default"
      )}
      style={{ paddingLeft: depth * 16 + 4 }}
      onClick={handleClick}
    >
      <span
        className={clsx(
          "size-4 flex items-center justify-center shrink-0 text-tertiary",
          "transition-transform duration-(--transition-fast)",
          expanded && "rotate-90",
          !hasChildren && "invisible"
        )}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {node.icon && <span className="mr-2 flex shrink-0">{node.icon}</span>}
      <span className="flex-1 truncate text-primary">{node.label}</span>
      {node.badge && <span className="ml-2 shrink-0">{node.badge}</span>}
      {node.detail && <span className="ml-2 shrink-0 text-secondary text-xs font-mono">{node.detail}</span>}
    </div>
  )
}
