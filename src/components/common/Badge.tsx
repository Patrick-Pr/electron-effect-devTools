import type { CSSProperties, ReactNode } from "react"

const variantColors: Record<string, string> = {
  Counter: "var(--accent-blue)",
  Gauge: "var(--accent-green)",
  Histogram: "var(--accent-orange)",
  Summary: "var(--accent-purple)",
  Frequency: "var(--accent-yellow)",
  connected: "var(--status-ok)",
  disconnected: "var(--text-tertiary)",
  websocket: "var(--accent-cyan)",
  browser: "var(--accent-purple)",
  node: "var(--accent-green)"
}

interface BadgeProps {
  children: ReactNode
  variant?: string
  color?: string
}

export function Badge({ children, variant, color }: BadgeProps) {
  const resolvedColor = color ?? (variant ? variantColors[variant] : undefined) ?? "var(--text-secondary)"

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 6px",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--font-size-xs)",
    fontFamily: "var(--font-mono)",
    lineHeight: 1.4,
    color: resolvedColor,
    background: `color-mix(in srgb, ${resolvedColor} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${resolvedColor} 25%, transparent)`,
    whiteSpace: "nowrap" as const
  }

  return <span style={style}>{children}</span>
}
