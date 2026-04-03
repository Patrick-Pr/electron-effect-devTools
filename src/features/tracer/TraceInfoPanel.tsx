import type { CSSProperties } from "react"
import type { TraceSpanRecord, TraceEventRecord } from "../../lib/contracts/tracer"
import { Badge } from "../../components/common/Badge"
import { formatMs } from "./trace-viewer-utils"

interface TraceInfoPanelProps {
  selectedEvent: TraceEventRecord | null
  spans: TraceSpanRecord[]
}

const panelStyle: CSSProperties = {
  height: "100%",
  overflow: "auto",
  background: "var(--bg-surface)",
  borderLeft: "1px solid var(--border-default)"
}

const padded: CSSProperties = {
  padding: "var(--space-4)"
}

const emptyStyle: CSSProperties = {
  ...padded,
  color: "var(--text-tertiary)",
  textAlign: "center",
  marginTop: "var(--space-8)",
  fontSize: "var(--font-size-sm)"
}

const sectionTitle: CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "var(--space-2)",
  marginTop: "var(--space-4)"
}

const fieldStyle: CSSProperties = {
  marginBottom: "var(--space-3)"
}

const labelStyle: CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--text-secondary)",
  marginBottom: 2
}

const valueStyle: CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
  wordBreak: "break-all"
}

function findSpan(spans: TraceSpanRecord[], eventId: string): TraceSpanRecord | undefined {
  for (const span of spans) {
    if (span.id === eventId) return span
    if (span.children) {
      const found = findSpan(span.children, eventId)
      if (found) return found
    }
  }
  return undefined
}

export function TraceInfoPanel({ selectedEvent, spans }: TraceInfoPanelProps) {
  if (!selectedEvent) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>Click a span to see details</div>
      </div>
    )
  }

  const span = findSpan(spans, selectedEvent.id)
  const duration = selectedEvent.endTime - selectedEvent.startTime

  return (
    <div style={panelStyle}>
      <div style={padded}>
        <h3 style={{
          margin: 0,
          fontSize: "var(--font-size-lg)",
          color: "var(--text-primary)",
          fontWeight: 600,
          wordBreak: "break-word"
        }}>
          {selectedEvent.name}
        </h3>

        <div style={{ ...sectionTitle, marginTop: "var(--space-3)" }}>Timing</div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Duration</div>
          <div style={valueStyle}>{formatMs(duration)}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Start</div>
          <div style={valueStyle}>{formatMs(selectedEvent.startTime)}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>End</div>
          <div style={valueStyle}>{formatMs(selectedEvent.endTime)}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Depth</div>
          <div style={valueStyle}>{selectedEvent.depth}</div>
        </div>

        {span && (
          <>
            {span.spanId && (
              <div style={fieldStyle}>
                <div style={labelStyle}>Span ID</div>
                <div style={valueStyle}>{span.spanId}</div>
              </div>
            )}

            {span.traceId && (
              <div style={fieldStyle}>
                <div style={labelStyle}>Trace ID</div>
                <div style={valueStyle}>{span.traceId}</div>
              </div>
            )}

            {span.location && (
              <div style={fieldStyle}>
                <div style={labelStyle}>Location</div>
                <div style={{
                  ...valueStyle,
                  color: "var(--text-link)",
                  cursor: "pointer"
                }}
                  onClick={() => window.electronAPI.revealLocation(span.location!)}
                >
                  {span.location.path}:{span.location.line}:{span.location.column}
                </div>
              </div>
            )}

            {span.attributes.length > 0 && (
              <>
                <div style={sectionTitle}>Attributes</div>
                {span.attributes.map((attr) => (
                  <div key={attr.id} style={fieldStyle}>
                    <div style={labelStyle}>{attr.name}</div>
                    <div style={valueStyle}>{attr.value}</div>
                  </div>
                ))}
              </>
            )}

            {span.events.length > 0 && (
              <>
                <div style={sectionTitle}>Events</div>
                {span.events.map((evt) => (
                  <div key={evt.id} style={{
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--bg-raised)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "var(--space-2)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>{evt.name}</span>
                      <Badge color="var(--accent-yellow)">{evt.offsetLabel}</Badge>
                    </div>
                    {evt.attributes.length > 0 && (
                      <div style={{ marginTop: "var(--space-1)" }}>
                        {evt.attributes.map((a) => (
                          <div key={a.id} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "var(--font-size-xs)",
                            padding: "1px 0"
                          }}>
                            <span style={{ color: "var(--text-secondary)" }}>{a.name}</span>
                            <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{a.value}</span>
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
