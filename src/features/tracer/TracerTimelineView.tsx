import { useMemo, useState } from "react"
import { Panel } from "../../components/panel/Panel"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { SplitPane } from "../../components/layout/SplitPane"
import type { TraceEventRecord, TraceSpanRecord } from "../../lib/contracts/tracer"
import { traceEvents, tracerTree } from "../../mocks/tracer"
import { invokePreviewAction } from "../../mocks/actions"
import { TraceInfoPanel } from "./TraceInfoPanel"
import { TraceMinimap } from "./TraceMinimap"
import { TraceViewer } from "./TraceViewer"
import type { ViewState } from "./trace-viewer-types"

function flatten(spans: TraceSpanRecord[]): TraceSpanRecord[] {
  return spans.flatMap((span) => [span, ...(span.children ? flatten(span.children) : [])])
}

const allSpans = flatten(tracerTree)

export function TracerTimelineView() {
  const [selectedId, setSelectedId] = useState<string>(traceEvents[0]?.id)
  const [viewState, setViewState] = useState<ViewState>({ startTime: 0, endTime: 620, offsetY: 0 })

  const selectedTrace = useMemo(() => allSpans.find((span) => span.id === selectedId), [selectedId])

  return (
    <Panel>
      <PanelHeader
        title="Tracer Timeline"
        subtitle="A standalone version of the extension webview with mock trace data and FIXME action boundaries."
        actions={<button className="secondary-button" onClick={() => invokePreviewAction("timeline:reset")}>Reset timeline</button>}
      />
      <SplitPane
        sidebar={
          <div className="timeline-sidebar">
            <h3>Visible spans</h3>
            {traceEvents.map((trace) => (
              <button key={trace.id} className={`timeline-list-row${selectedId === trace.id ? " is-active" : ""}`} onClick={() => setSelectedId(trace.id)}>
                <span className="timeline-swatch" style={{ background: trace.color }} />
                <span>{trace.name}</span>
              </button>
            ))}
          </div>
        }
        main={
          <div className="timeline-workspace">
            <TraceMinimap traces={traceEvents} viewState={viewState} onViewStateChange={setViewState} options={{ minimapHeight: 92 }} />
            <TraceViewer traces={traceEvents as TraceEventRecord[]} viewState={viewState} onViewStateChange={setViewState} options={{ barHeight: 20, barPadding: 8, timelineHeight: 24 }} onTraceClick={(trace) => setSelectedId(trace.id)} />
          </div>
        }
        details={<TraceInfoPanel trace={selectedTrace} />}
      />
    </Panel>
  )
}
