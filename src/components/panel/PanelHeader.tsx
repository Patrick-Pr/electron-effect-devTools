import type { ReactNode } from "react"

interface PanelHeaderProps {
  title: string
  count?: number
  children?: ReactNode
}

export function PanelHeader({ title, count, children }: PanelHeaderProps) {
  return (
    <div className="flex items-center h-(--top-bar-height) px-4 border-b border-border bg-raised shrink-0 select-none gap-2">
      <span className="text-sm font-semibold text-secondary uppercase tracking-[0.05em]">{title}</span>
      {count !== undefined && <span className="text-xs text-tertiary font-mono">({count})</span>}
      <div className="ml-auto flex items-center gap-1">{children}</div>
    </div>
  )
}
