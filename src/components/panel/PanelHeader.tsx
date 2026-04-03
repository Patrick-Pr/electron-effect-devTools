import type { CSSProperties, ReactNode } from "react"

interface PanelHeaderProps {
  title: string
  count?: number
  children?: ReactNode
}

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: "var(--top-bar-height)",
  padding: "0 var(--space-4)",
  borderBottom: "1px solid var(--border-default)",
  background: "var(--bg-raised)",
  flexShrink: 0,
  userSelect: "none",
  gap: "var(--space-2)"
}

const titleStyle: CSSProperties = {
  fontSize: "var(--font-size-sm)",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
}

const countStyle: CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--text-tertiary)",
  fontFamily: "var(--font-mono)"
}

const actionsStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-1)"
}

export function PanelHeader({ title, count, children }: PanelHeaderProps) {
  return (
    <div style={containerStyle}>
      <span style={titleStyle}>{title}</span>
      {count !== undefined && <span style={countStyle}>({count})</span>}
      <div style={actionsStyle}>{children}</div>
    </div>
  )
}
