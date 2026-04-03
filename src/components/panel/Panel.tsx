import type { ReactNode } from "react"

interface PanelProps {
  children: ReactNode
  noPadding?: boolean
}

export function Panel({ children }: PanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
