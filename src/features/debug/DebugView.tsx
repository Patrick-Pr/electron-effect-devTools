import { useMemo, useState } from "react"
import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { BreakpointsView } from "./BreakpointsView"
import { ContextView } from "./ContextView"
import { FibersView } from "./FibersView"
import { SpanStackView } from "./SpanStackView"

type DebugTab = "context" | "stack" | "fibers" | "breakpoints"

const tabs: Array<{ id: DebugTab; label: string }> = [
  { id: "context", label: "Effect Context" },
  { id: "stack", label: "Span Stack" },
  { id: "fibers", label: "Fibers" },
  { id: "breakpoints", label: "Breakpoints" }
]

export function DebugView() {
  const [activeTab, setActiveTab] = useState<DebugTab>("context")

  const content = useMemo(() => {
    switch (activeTab) {
      case "context":
        return <ContextView />
      case "stack":
        return <SpanStackView />
      case "fibers":
        return <FibersView />
      case "breakpoints":
        return <BreakpointsView />
    }
  }, [activeTab])

  return (
    <Panel>
      <PanelHeader title="Debug" subtitle="Preview the inspector surfaces that appear during a debug session." />
      <div className="tab-strip">
        {tabs.map((tab) => (
          <button key={tab.id} className={`tab-button${activeTab === tab.id ? " is-active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {content}
    </Panel>
  )
}
