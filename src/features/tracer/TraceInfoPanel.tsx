import type { TraceSpanRecord } from "../../lib/contracts/tracer"
import { Badge } from "../../components/common/Badge"
import { revealPreviewLocation } from "../../mocks/actions"

interface TraceInfoPanelProps {
  trace?: TraceSpanRecord
}

export function TraceInfoPanel({ trace }: TraceInfoPanelProps) {
  if (!trace) {
    return (
      <div className="trace-info-panel empty">
        <p>Click on a span to see details.</p>
      </div>
    )
  }

  return (
    <div className="trace-info-panel">
      <div className="trace-info-header">
        <h3>Span Details</h3>
        <Badge tone="accent">{trace.durationLabel ?? "running"}</Badge>
      </div>
      <dl>
        <dt>Name</dt>
        <dd>{trace.name}</dd>
        <dt>Trace ID</dt>
        <dd className="mono">{trace.traceId}</dd>
        <dt>Span ID</dt>
        <dd className="mono">{trace.spanId}</dd>
        {trace.location ? (
          <>
            <dt>Location</dt>
            <dd>
              <button className="link-button" onClick={() => revealPreviewLocation(trace.location!.path, trace.location!.line, trace.location!.column)}>
                {trace.location.path}:{trace.location.line}:{trace.location.column}
              </button>
            </dd>
          </>
        ) : null}
      </dl>
      <div className="trace-attribute-list">
        {trace.attributes.map((attribute) => (
          <div key={attribute.id} className="trace-attribute-row">
            <span>{attribute.name}</span>
            <span className="mono">{attribute.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
