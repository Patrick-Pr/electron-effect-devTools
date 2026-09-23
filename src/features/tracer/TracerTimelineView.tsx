import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import {
  clampViewToBounds,
  findSpanById,
  fitViewToBounds,
  getDefaultExpandedIds,
  getTraceTimeBounds,
  layoutTimelineRows
} from "./trace-viewer-utils"

const ClearTracesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const FitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
  </svg>
)

export function TracerTimelineView() {
  const snapshot = useBackendSnapshot()
  const { events, spans } = snapshot.tracer
  const activeClientId = snapshot.clients.clients.find((client) => client.active)?.id ?? null
  const bounds = useMemo(() => getTraceTimeBounds(events), [events])
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events])
  const [viewState, setViewState] = useState<ViewState>(() => fitViewToBounds(bounds))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => getDefaultExpandedIds(spans))
  const previousDatasetRef = useRef({
    clientId: activeClientId,
    empty: events.length === 0,
    eventIds: new Set(events.map((event) => event.id))
  })

  const rows = useMemo(() => layoutTimelineRows(spans, events, expandedIds), [events, expandedIds, spans])
  const selectedEvent = selectedId ? eventById.get(selectedId) ?? null : null
  const selectedSpan = selectedId ? findSpanById(spans, selectedId) ?? null : null

  useEffect(() => {
    const previous = previousDatasetRef.current
    const identityChanged = previous.clientId !== activeClientId
    const repopulated = previous.empty && events.length > 0
    const currentEventIds = new Set(events.map((event) => event.id))
    const replaced = previous.eventIds.size > 0 && currentEventIds.size > 0 &&
      ![...currentEventIds].some((id) => previous.eventIds.has(id))
    if (identityChanged || repopulated || replaced) {
      setSelectedId(null)
      setExpandedIds(getDefaultExpandedIds(spans))
      setViewState(fitViewToBounds(bounds))
    } else {
      setViewState((current) => clampViewToBounds(current, bounds))
    }
    previousDatasetRef.current = { clientId: activeClientId, empty: events.length === 0, eventIds: currentEventIds }
  }, [activeClientId, bounds, events.length, spans])

  useEffect(() => {
    if (selectedId && !eventById.has(selectedId)) setSelectedId(null)
  }, [eventById, selectedId])

  const handleViewStateChange = useCallback((next: ViewState) => {
    setViewState(clampViewToBounds(next, bounds))
  }, [bounds])

  const handleFit = useCallback(() => setViewState(fitViewToBounds(bounds)), [bounds])
  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    void window.electronAPI.dispatch({ type: "timeline:reset" })
    setSelectedId(null)
  }, [])

  const header = (
    <PanelHeader title="Timeline" count={events.length || undefined}>
      <IconButton title="Fit timeline to data" onClick={handleFit} disabled={events.length === 0}><FitIcon /></IconButton>
      <IconButton title="Reset timeline" onClick={handleReset}><ClearTracesIcon /></IconButton>
    </PanelHeader>
  )

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {header}
        <EmptyState title="No trace events" description="Timeline events will appear here when spans with timing data are reported" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {header}
      <div className="border-b border-border shrink-0" style={{ height: defaultOptions.minimapHeight }}>
        <TraceMinimap rows={rows} viewState={viewState} onViewStateChange={handleViewStateChange} options={defaultOptions} />
      </div>
      <div className="flex-1 overflow-hidden">
        <SplitPane
          left={
            <TraceViewer
              rows={rows}
              viewState={viewState}
              onViewStateChange={handleViewStateChange}
              options={defaultOptions}
              selectedId={selectedId}
              onTraceSelect={setSelectedId}
              onToggleExpanded={handleToggleExpanded}
            />
          }
          right={<TraceInfoPanel selectedEvent={selectedEvent} selectedSpan={selectedSpan} />}
          initialRightWidth={280}
          minRightWidth={200}
          maxRightWidth={450}
        />
      </div>
    </div>
  )
}
