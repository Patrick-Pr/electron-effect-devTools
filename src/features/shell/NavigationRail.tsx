import clsx from "clsx"
import type { AppView } from "./types"

interface NavigationRailProps {
  activeView: AppView
  onSelectView: (view: AppView) => void
}

const items: { view: AppView; label: string; icon: React.ReactNode }[] = [
  {
    view: "clients",
    label: "Clients",
    icon: (
      <svg width="32" height="32" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="6" r="3" />
        <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    )
  },
  {
    view: "tracer",
    label: "Tracer",
    icon: (
      <svg width="32" height="32" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h14M5 9h10M7 13h6M9 17h2" />
      </svg>
    )
  },
  {
    view: "timeline",
    label: "Timeline",
    icon: (
      <svg width="32" height="32" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="32" height="32" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="3" height="7" rx="0.5" />
        <rect x="8.5" y="6" width="3" height="11" rx="0.5" />
        <rect x="14" y="3" width="3" height="14" rx="0.5" />
      </svg>
    )
  },
  {
    view: "debug",
    label: "Debug",
    icon: (
      <svg width="32" height="32" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="11" r="5" /><path d="M7 5V3M13 5V3M5 8H2M18 8h-3M5 12H2M18 12h-3M8 9v4M12 9v4" />
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
  return (
    <button
      className={clsx(
        "w-14 h-14 flex flex-col items-center justify-center gap-0.5 border-none rounded-md cursor-pointer p-0 relative",
        "transition-[background,color] duration-(--transition-fast-duration) ease-(--transition-ease)",
        active
          ? "bg-subtle-active text-primary"
          : "bg-transparent text-secondary hover:bg-subtle-hover"
      )}
      title={label}
      onClick={() => onSelect(view)}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={clsx(
          "absolute -left-1.25 top-1/2 -translate-y-1/2 w-0.75 h-4 rounded-r-[2px] bg-accent-blue",
          "transition-opacity duration-(--transition-fast-duration) ease-(--transition-ease)",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      {icon}
      <span className="text-sm leading-none tracking-[0.02em]">{label}</span>
    </button>
  )
}

export function NavigationRail({ activeView, onSelectView }: NavigationRailProps) {
  return (
    <nav className="w-(--nav-rail-width) h-full flex flex-col items-center pt-2 gap-1 bg-inset border-r border-border shrink-0 select-none">
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
