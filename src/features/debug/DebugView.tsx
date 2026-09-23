import { IconButton } from "../../components/common/IconButton"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { StatusNotification } from "../../components/common/StatusNotification"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { BreakpointsView } from "./BreakpointsView"
import { ContextView } from "./ContextView"
import { FibersView } from "./FibersView"
import { SpanStackView } from "./SpanStackView"

const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 5V2l-2 2a5 5 0 10.8 7M13 2h-3" /></svg>

export function DebugView() {
  const { debug } = useBackendSnapshot()
  const attached = Boolean(debug.sessionId)
  const level = debug.status === "error" ? "error" : debug.status === "paused" ? "ok" : "info"
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader title="Debug">
        <span className="text-xs text-tertiary">{debug.sessionName}</span>
        <IconButton title="Refresh debug snapshot" disabled={!attached} onClick={() => { void window.electronAPI.dispatch({ type: "debug:snapshot:refresh" }) }}><RefreshIcon /></IconButton>
      </PanelHeader>
      <StatusNotification level={level} message={debug.message} />
      <div className="grid grid-cols-2 grid-rows-2 flex-1 min-h-0 bg-surface">
        <ContextView context={debug.context} />
        <SpanStackView spans={debug.spanStack} ignoreListEnabled={debug.spanStackIgnoreListEnabled} />
        <FibersView fibers={debug.fibers} />
        <BreakpointsView breakpoints={debug.breakpoints} attached={attached} />
      </div>
    </div>
  )
}
