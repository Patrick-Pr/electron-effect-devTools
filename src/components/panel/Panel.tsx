import type { CSSProperties, ReactNode } from "react"

interface PanelProps {
  children: ReactNode
  noPadding?: boolean
}

export function Panel({ children, noPadding }: PanelProps) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    background: "var(--bg-surface)"
  }

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflow: "auto",
    padding: noPadding ? 0 : undefined
  }

  return (
    <div style={style}>
      <div style={bodyStyle}>{children}</div>
    </div>
  )
}
