import type { AppView } from "./types"
import { NavigationRail } from "./NavigationRail"
import { TopBar } from "./TopBar"

interface AppShellProps {
  activeView: AppView
  onSelectView: (view: AppView) => void
  children: React.ReactNode
}

export function AppShell({ activeView, onSelectView, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <NavigationRail activeView={activeView} onSelect={onSelectView} />
      <div className="app-frame">
        <TopBar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
