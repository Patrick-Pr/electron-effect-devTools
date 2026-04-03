import type { ReactNode } from "react"

type StatusLevel = "ok" | "warn" | "error" | "info"

interface StatusNotificationProps {
  level: StatusLevel
  message: string
  detail?: string
  action?: ReactNode
}

const levelColors: Record<StatusLevel, string> = {
  ok: "var(--color-status-ok)",
  warn: "var(--color-status-warn)",
  error: "var(--color-status-error)",
  info: "var(--color-status-info)"
}

export function StatusNotification({ level, message, detail, action }: StatusNotificationProps) {
  const color = levelColors[level]

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 text-sm"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--color-surface))`,
        borderLeft: `3px solid ${color}`
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill={color} className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="6" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-primary">{message}</div>
        {detail && <div className="mt-1 text-secondary text-xs font-mono whitespace-pre-wrap wrap-break-word">{detail}</div>}
      </div>
      {action && <div className="">{action}</div>}
    </div>
  )
}
