import { useEffect, useMemo, useState } from "react"
import { EmptyState } from "../../components/common/EmptyState"
import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { SplitPane } from "../../components/layout/SplitPane"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import type { TraceEventRecord, TraceSpanRecord } from "../../lib/contracts/tracer"
import { invokePreviewAction } from "../../mocks/actions"
import { TraceInfoPanel } from "./TraceInfoPanel"
import { TraceMinimap } from "./TraceMinimap"
import { TraceViewer } from "./TraceViewer"
import type { ViewState } from "./trace-viewer-types"
import { getTraceTimeBounds } from "./trace-viewer-utils"

function flatten(spans: TraceSpanRecord[]): TraceSpanRecord[] {
  return spans.flatMap((span) => [span, ...(span.children ? flatten(span.children) : [])])
}

export function TracerTimelineView() {
  const { tracer } = useBackendSnapshot()
  const allSpans = useMemo(() => flatten(tracer.spans), [tracer.spans])
  const timeBounds = useMemo(() => getTraceTimeBounds(tracer.events), [tracer.events])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [viewState, setViewState] = useState<ViewState>({ startTime: 0, endTime: 1, offsetY: 0 })

  useEffect(() => {
    setSelectedId((current) => current && tracer.events.some((trace) => trace.id === current) ? current : tracer.events[0]?.id)
  }, [tracer.events])

  useEffect(() => {
    setViewState({
      startTime: timeBounds.startTime,
      endTime: timeBounds.endTime,
      offsetY: 0
    })
  }, [timeBounds.endTime, timeBounds.startTime])

  const selectedTrace = useMemo(() => allSpans.find((span) => span.id === selectedId), [allSpans, selectedId])

  return (
    <Panel>
      <PanelHeader
        title="Tracer Timeline"
        subtitle="A live Electron version of the extension tracer timeline driven by the backend trace stream."
        actions={<button className="secondary-button" onClick={() => invokePreviewAction({ type: "timeline:reset" })}>Reset timeline</button>}
      />
      {tracer.events.length > 0 ? <SplitPane
        sidebar={
          <div className="timeline-sidebar">
            <h3>Visible spans</h3>
            {tracer.events.map((trace) => (
              <button key={trace.id} className={`timeline-list-row${selectedId === trace.id ? " is-active" : ""}`} onClick={() => setSelectedId(trace.id)}>
                <span className="timeline-swatch" style={{ background: trace.color }} />
                <span>{trace.name}</span>
              </button>
            ))}
          </div>
        }
        main={
          <div className="timeline-workspace">
            <TraceMinimap traces={tracer.events} viewState={viewState} onViewStateChange={setViewState} options={{ minimapHeight: 92 }} />
            <TraceViewer traces={tracer.events as TraceEventRecord[]} viewState={viewState} onViewStateChange={setViewState} options={{ barHeight: 30, barPadding: 4, timelineHeight: 24 }} onTraceClick={(trace) => setSelectedId(trace.id)} />
          </div>
        }
        details={<TraceInfoPanel trace={selectedTrace} />}
      /> : <EmptyState title="No timeline data" body="Timeline events appear after the active client emits traced spans." />}
    </Panel>
  )
}
