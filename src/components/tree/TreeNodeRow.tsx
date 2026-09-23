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
        "flex items-center h-(--row-height) pr-2 select-none text-sm",
        "transition-[background] duration-(--transition-fast-duration) ease-(--transition-ease)",
        "hover:bg-subtle-hover"
      )}
      style={{ paddingLeft: depth * 16 + 4 }}
    >
      <button
        type="button"
        disabled={!hasChildren && !node.onClick}
        className="flex items-center min-w-0 flex-1 h-full border-0 bg-transparent p-0 text-left disabled:cursor-default"
        onClick={handleClick}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-controls={hasChildren ? `tree-children-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}` : undefined}
      >
        <span className={clsx(
          "size-4 flex items-center justify-center shrink-0 text-tertiary transition-transform duration-(--transition-fast-duration) ease-(--transition-ease)",
          expanded && "rotate-90",
          !hasChildren && "invisible"
        )}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        {node.icon && <span className="mr-2 flex shrink-0">{node.icon}</span>}
        <span className="flex-1 truncate text-primary">{node.label}</span>
        {node.badge && <span className="ml-2 shrink-0">{node.badge}</span>}
        {node.detail && <span className="ml-2 shrink-0 text-secondary text-xs font-mono">{node.detail}</span>}
      </button>
      {node.actions && <span className="ml-1 flex shrink-0">{node.actions}</span>}
    </div>
  )
}
