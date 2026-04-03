import type { ReactNode } from "react"
import type { AppView } from "./types"
import { NavigationRail } from "./NavigationRail"
import { TopBar } from "./TopBar"

interface AppShellProps {
  activeView: AppView
  onSelectView: (view: AppView) => void
  children: ReactNode
}

export function AppShell({ activeView, onSelectView, children }: AppShellProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <NavigationRail activeView={activeView} onSelectView={onSelectView} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
