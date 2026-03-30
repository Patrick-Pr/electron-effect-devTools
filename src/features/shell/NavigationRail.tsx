import type { AppView } from "./types"

const items: Array<{ id: AppView; label: string; icon: string }> = [
  { id: "clients", label: "Clients", icon: "◎" },
  { id: "tracer", label: "Tracer", icon: "⟠" },
  { id: "timeline", label: "Timeline", icon: "▤" },
  { id: "metrics", label: "Metrics", icon: "◫" },
  { id: "debug", label: "Debug", icon: "◇" }
]

interface NavigationRailProps {
  activeView: AppView
  onSelect: (view: AppView) => void
}

export function NavigationRail({ activeView, onSelect }: NavigationRailProps) {
  return (
    <nav className="navigation-rail">
      <div className="navigation-brand">fx</div>
      <div className="navigation-items">
        {items.map((item) => (
          <button
            key={item.id}
            className={`rail-item${activeView === item.id ? " is-active" : ""}`}
            onClick={() => onSelect(item.id)}
            title={item.label}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
