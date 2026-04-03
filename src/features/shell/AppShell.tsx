import type { CSSProperties, ReactNode } from "react"
import type { AppView } from "./types"
import { NavigationRail } from "./NavigationRail"
import { TopBar } from "./TopBar"

interface AppShellProps {
  activeView: AppView
  onSelectView: (view: AppView) => void
  children: ReactNode
}

const shellStyle: CSSProperties = {
  display: "flex",
  height: "100%",
  width: "100%",
  overflow: "hidden"
}

const mainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minWidth: 0
}

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden"
}

export function AppShell({ activeView, onSelectView, children }: AppShellProps) {
  return (
    <div style={shellStyle}>
      <NavigationRail activeView={activeView} onSelectView={onSelectView} />
      <div style={mainStyle}>
        <TopBar />
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  )
}
