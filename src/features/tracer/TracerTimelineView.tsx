import { useCallback, useMemo, useState } from "react"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { IconButton } from "../../components/common/IconButton"
import { EmptyState } from "../../components/common/EmptyState"
import { SplitPane } from "../../components/layout/SplitPane"
import TraceViewer from "./TraceViewer"
import TraceMinimap from "./TraceMinimap"
import { TraceInfoPanel } from "./TraceInfoPanel"
import type { ViewState } from "./trace-viewer-types"
import { defaultOptions } from "./trace-viewer-types"
import { fullTimeRange } from "./trace-viewer-utils"
import type { TraceEventRecord } from "../../lib/contracts/tracer"

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8a6 6 0 1111.5-2.5" />
    <path d="M2 3v5h5" />
  </svg>
)

export function TracerTimelineView() {
  const { tracer: { events, spans } } = useBackendSnapshot()

  const range = useMemo(() => fullTimeRange(events), [events])

  const [viewState, setViewState] = useState<ViewState>(() => {
    if (range) {
      const padding = Math.max((range.end - range.start) * 0.1, 50)
      return {
        startMs: range.start - padding,
        endMs: range.end + padding,
        offsetY: 0
      }
    }
    return { startMs: 0, endMs: 2000, offsetY: 0 }
  })

  const [selectedEvent, setSelectedEvent] = useState<TraceEventRecord | null>(null)

  const handleViewStateChange = useCallback((vs: ViewState) => {
    const maxRange = 3600_000
    if (vs.endMs - vs.startMs < maxRange) {
      setViewState(vs)
    }
  }, [])

  const handleTraceClick = useCallback((trace: TraceEventRecord) => {
    setSelectedEvent(trace)
  }, [])

  const handleReset = useCallback(() => {
    window.electronAPI.dispatch({ type: "timeline:reset" })
    setSelectedEvent(null)
  }, [])

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PanelHeader title="Timeline">
          <IconButton title="Reset timeline" onClick={handleReset}>
            <ResetIcon />
          </IconButton>
        </PanelHeader>
        <EmptyState
          title="No trace events"
          description="Timeline events will appear here when spans with timing data are reported"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader title="Timeline" count={events.length}>
        <IconButton title="Reset timeline" onClick={handleReset}>
          <ResetIcon />
        </IconButton>
      </PanelHeader>
      <div className="border-b border-border shrink-0" style={{ height: defaultOptions.minimapHeight }}>
        <TraceMinimap
          traces={events}
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          options={defaultOptions}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <SplitPane
          left={
            <TraceViewer
              traces={events}
              viewState={viewState}
              onViewStateChange={handleViewStateChange}
              options={defaultOptions}
              onTraceClick={handleTraceClick}
            />
          }
          right={
            <TraceInfoPanel
              selectedEvent={selectedEvent}
              spans={spans}
            />
          }
          initialRightWidth={280}
          minRightWidth={200}
          maxRightWidth={450}
        />
      </div>
    </div>
  )
}
