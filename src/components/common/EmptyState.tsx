import type { CSSProperties, ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-8) var(--space-4)",
  gap: "var(--space-3)",
  color: "var(--text-tertiary)",
  textAlign: "center",
  userSelect: "none"
}

const iconStyle: CSSProperties = {
  opacity: 0.4,
  fontSize: 32,
  lineHeight: 1
}

const titleStyle: CSSProperties = {
  fontSize: "var(--font-size-md)",
  color: "var(--text-secondary)"
}

const descStyle: CSSProperties = {
  fontSize: "var(--font-size-sm)",
  maxWidth: 280,
  lineHeight: 1.5
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div style={containerStyle}>
      {icon && <div style={iconStyle}>{icon}</div>}
      <div style={titleStyle}>{title}</div>
      {description && <div style={descStyle}>{description}</div>}
    </div>
  )
}
