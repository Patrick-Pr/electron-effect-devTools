import type { TraceSpanRecord, TraceEventRecord } from "../../lib/contracts/tracer"
import { Badge } from "../../components/common/Badge"
import { formatMs } from "./trace-viewer-utils"

interface TraceInfoPanelProps {
  selectedEvent: TraceEventRecord | null
  selectedSpan: TraceSpanRecord | null
}

export function TraceInfoPanel({ selectedEvent, selectedSpan: span }: TraceInfoPanelProps) {
  if (!selectedEvent) {
    return (
      <div className="h-full overflow-auto bg-surface border-l border-border">
        <div className="p-4 text-tertiary text-center mt-8 text-sm">Click a span to see details</div>
      </div>
    )
  }

  const duration = selectedEvent.endTime - selectedEvent.startTime

  return (
    <div className="h-full overflow-auto bg-surface border-l border-border">
      <div className="p-4">
        <h3 className="m-0 text-lg text-primary font-semibold wrap-break-word">{selectedEvent.name}</h3>

        <div className="text-xs text-tertiary uppercase tracking-[0.06em] mb-2 mt-3">Timing</div>

        <div className="mb-3">
          <div className="text-xs text-secondary mb-0.5">Duration</div>
          <div className="text-sm text-primary font-mono break-all">{formatMs(duration)}</div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-secondary mb-0.5">Start</div>
          <div className="text-sm text-primary font-mono break-all">{formatMs(selectedEvent.startTime)}</div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-secondary mb-0.5">End</div>
          <div className="text-sm text-primary font-mono break-all">{formatMs(selectedEvent.endTime)}</div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-secondary mb-0.5">Depth</div>
          <div className="text-sm text-primary font-mono break-all">{selectedEvent.depth}</div>
        </div>

        {span && (
          <>
            {span.spanId && (
              <div className="mb-3">
                <div className="text-xs text-secondary mb-0.5">Span ID</div>
                <div className="text-sm text-primary font-mono break-all">{span.spanId}</div>
              </div>
            )}

            {span.traceId && (
              <div className="mb-3">
                <div className="text-xs text-secondary mb-0.5">Trace ID</div>
                <div className="text-sm text-primary font-mono break-all">{span.traceId}</div>
              </div>
            )}

            {span.location && (
              <div className="mb-3">
                <div className="text-xs text-secondary mb-0.5">Location</div>
                <button
                  type="button"
                  className="text-left border-0 bg-transparent p-0 text-sm font-mono break-all text-link cursor-pointer"
                  onClick={() => window.electronAPI.revealLocation(span.location!)}
                  aria-label={`Reveal ${span.name} at ${span.location.path}:${span.location.line}:${span.location.column}`}
                >
                  {span.location.path}:{span.location.line}:{span.location.column}
                </button>
              </div>
            )}

            {span.attributes.length > 0 && (
              <>
                <div className="text-xs text-tertiary uppercase tracking-[0.06em] mb-2 mt-4">Attributes</div>
                {span.attributes.map((attr) => (
                  <div key={attr.id} className="mb-3">
                    <div className="text-xs text-secondary mb-0.5">{attr.name}</div>
                    <div className="text-sm text-primary font-mono break-all">{attr.value}</div>
                  </div>
                ))}
              </>
            )}

            {span.events.length > 0 && (
              <>
                <div className="text-xs text-tertiary uppercase tracking-[0.06em] mb-2 mt-4">Events</div>
                {span.events.map((evt) => (
                  <div key={evt.id} className="py-2 px-3 bg-raised rounded-sm mb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-primary">{evt.name}</span>
                      <Badge color="var(--color-accent-yellow)">{evt.offsetLabel}</Badge>
                    </div>
                    {evt.attributes.length > 0 && (
                      <div className="mt-1">
                        {evt.attributes.map((a) => (
                          <div key={a.id} className="flex justify-between text-xs py-px">
                            <span className="text-secondary">{a.name}</span>
                            <span className="text-primary font-mono">{a.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
