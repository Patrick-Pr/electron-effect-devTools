import { type CSSProperties, useState } from "react"
import type { AppView } from "./types"

interface NavigationRailProps {
  activeView: AppView
  onSelectView: (view: AppView) => void
}

const railStyle: CSSProperties = {
  width: "var(--nav-rail-width)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "var(--space-2)",
  gap: "var(--space-1)",
  background: "var(--bg-inset)",
  borderRight: "1px solid var(--border-default)",
  flexShrink: 0,
  userSelect: "none"
}

const items: { view: AppView; label: string; icon: React.ReactNode }[] = [
  {
    view: "clients",
    label: "Clients",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="6" r="3" />
        <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    )
  },
  {
    view: "tracer",
    label: "Tracer",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h14M5 9h10M7 13h6M9 17h2" />
      </svg>
    )
  },
  {
    view: "timeline",
    label: "Timeline",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="12" height="3" rx="1" />
        <rect x="4" y="9" width="14" height="3" rx="1" />
        <rect x="3" y="14" width="8" height="3" rx="1" />
      </svg>
    )
  },
  {
    view: "metrics",
    label: "Metrics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="3" height="7" rx="0.5" />
        <rect x="8.5" y="6" width="3" height="11" rx="0.5" />
        <rect x="14" y="3" width="3" height="14" rx="0.5" />
      </svg>
    )
  }
]

function NavItem({ view, label, icon, active, onSelect }: {
  view: AppView
  label: string
  icon: React.ReactNode
  active: boolean
  onSelect: (view: AppView) => void
}) {
  const [hovered, setHovered] = useState(false)

  const style: CSSProperties = {
    width: 38,
    height: 38,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    border: "none",
    borderRadius: "var(--radius-md)",
    background: active ? "var(--bg-active)" : hovered ? "var(--bg-hover)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    cursor: "pointer",
    padding: 0,
    transition: "background var(--transition-fast), color var(--transition-fast)",
    position: "relative"
  }

  const labelStyle: CSSProperties = {
    fontSize: 9,
    lineHeight: 1,
    letterSpacing: "0.02em"
  }

  const indicatorStyle: CSSProperties = {
    position: "absolute",
    left: -5,
    top: "50%",
    transform: "translateY(-50%)",
    width: 3,
    height: 16,
    borderRadius: "0 2px 2px 0",
    background: "var(--accent-blue)",
    opacity: active ? 1 : 0,
    transition: "opacity var(--transition-fast)"
  }

  return (
    <button
      style={style}
      title={label}
      onClick={() => onSelect(view)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={indicatorStyle} />
      {icon}
      <span style={labelStyle}>{label}</span>
    </button>
  )
}

export function NavigationRail({ activeView, onSelectView }: NavigationRailProps) {
  return (
    <nav style={railStyle}>
      {items.map((item) => (
        <NavItem
          key={item.view}
          view={item.view}
          label={item.label}
          icon={item.icon}
          active={activeView === item.view}
          onSelect={onSelectView}
        />
      ))}
    </nav>
  )
}
