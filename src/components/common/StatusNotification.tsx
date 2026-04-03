import type { CSSProperties, ReactNode } from "react"

type StatusLevel = "ok" | "warn" | "error" | "info"

interface StatusNotificationProps {
  level: StatusLevel
  message: string
  detail?: string
  action?: ReactNode
}

const levelColors: Record<StatusLevel, string> = {
  ok: "var(--status-ok)",
  warn: "var(--status-warn)",
  error: "var(--status-error)",
  info: "var(--status-info)"
}

export function StatusNotification({ level, message, detail, action }: StatusNotificationProps) {
  const color = levelColors[level]

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    background: `color-mix(in srgb, ${color} 8%, var(--bg-surface))`,
    borderLeft: `3px solid ${color}`,
    fontSize: "var(--font-size-sm)"
  }

  const bodyStyle: CSSProperties = {
    flex: 1,
    minWidth: 0
  }

  const messageStyle: CSSProperties = {
    color: "var(--text-primary)"
  }

  const detailStyle: CSSProperties = {
    marginTop: "var(--space-1)",
    color: "var(--text-secondary)",
    fontSize: "var(--font-size-xs)",
    fontFamily: "var(--font-mono)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  }

  return (
    <div style={containerStyle}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill={color} style={{ marginTop: 2, flexShrink: 0 }}>
        <circle cx="8" cy="8" r="6" />
      </svg>
      <div style={bodyStyle}>
        <div style={messageStyle}>{message}</div>
        {detail && <div style={detailStyle}>{detail}</div>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
