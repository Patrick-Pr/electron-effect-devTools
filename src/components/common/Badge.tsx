import type { ReactNode } from "react"

const variantColors: Record<string, string> = {
  Counter: "var(--color-accent-blue)",
  Gauge: "var(--color-accent-green)",
  Histogram: "var(--color-accent-orange)",
  Summary: "var(--color-accent-purple)",
  Frequency: "var(--color-accent-yellow)",
  connected: "var(--color-status-ok)",
  disconnected: "var(--color-tertiary)",
  websocket: "var(--color-accent-cyan)",
  browser: "var(--color-accent-purple)",
  node: "var(--color-accent-green)"
}

interface BadgeProps {
  children: ReactNode
  variant?: string
  color?: string
}

export function Badge({ children, variant, color }: BadgeProps) {
  const resolvedColor = color ?? (variant ? variantColors[variant] : undefined) ?? "var(--color-secondary)"

  return (
    <span
      className="inline-flex items-center px-1.5 py-px rounded-full text-xs font-mono leading-[1.4] whitespace-nowrap"
      style={{
        color: resolvedColor,
        background: `color-mix(in srgb, ${resolvedColor} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${resolvedColor} 25%, transparent)`
      }}
    >
      {children}
    </span>
  )
}
