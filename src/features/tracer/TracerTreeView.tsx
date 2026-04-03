import { type CSSProperties, useCallback, useMemo, useState } from "react"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { IconButton } from "../../components/common/IconButton"
import { Badge } from "../../components/common/Badge"
import { EmptyState } from "../../components/common/EmptyState"
import type { TraceSpanRecord, SpanEventRecord } from "../../lib/contracts/tracer"

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden"
}

const scrollArea: CSSProperties = {
  flex: 1,
  overflow: "auto"
}

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8a6 6 0 1111.5-2.5" />
    <path d="M2 3v5h5" />
  </svg>
)

const LocationIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--text-link)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 2l8 0M6 2L2 6" />
  </svg>
)

function SpanNode({ span, depth }: { span: TraceSpanRecord; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0)

  const hasContent = (span.children && span.children.length > 0) ||
    span.attributes.length > 0 ||
    span.events.length > 0

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    height: "var(--row-height)",
    paddingLeft: depth * 16 + 8,
    paddingRight: "var(--space-3)",
    cursor: hasContent ? "pointer" : "default",
    userSelect: "none",
    transition: "background var(--transition-fast)"
  }

  const chevronStyle: CSSProperties = {
    width: 14,
    height: 14,
    color: "var(--text-tertiary)",
    transition: "transform var(--transition-fast)",
    transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
    flexShrink: 0,
    visibility: hasContent ? "visible" : "hidden"
  }

  const nameStyle: CSSProperties = {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "var(--font-size-sm)",
    color: "var(--text-primary)"
  }

  const handleReveal = useCallback(() => {
    if (span.location) {
      window.electronAPI.revealLocation(span.location)
    }
  }, [span.location])

  return (
    <div>
      <div
        style={rowStyle}
        className="tree-row-hover"
        onClick={() => { if (hasContent) setExpanded(!expanded) }}
      >
        <span style={chevronStyle}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span style={nameStyle}>{span.name}</span>
        {span.location && (
          <span
            onClick={(e) => { e.stopPropagation(); handleReveal() }}
            style={{ cursor: "pointer", display: "flex" }}
            title={`${span.location.path}:${span.location.line}`}
          >
            <LocationIcon />
          </span>
        )}
        {span.durationLabel && (
          <Badge color="var(--text-secondary)">{span.durationLabel}</Badge>
        )}
      </div>
      {expanded && (
        <>
          {span.attributes.length > 0 && (
            <AttrSection depth={depth + 1} label="Attributes">
              {span.attributes.map((attr) => (
                <KVRow key={attr.id} depth={depth + 2} name={attr.name} value={attr.value} />
              ))}
            </AttrSection>
          )}
          {span.events.length > 0 && (
            <AttrSection depth={depth + 1} label="Events">
              {span.events.map((evt) => (
                <EventRow key={evt.id} event={evt} depth={depth + 2} />
              ))}
            </AttrSection>
          )}
          {span.children && span.children.map((child) => (
            <SpanNode key={child.id} span={child} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  )
}

function AttrSection({ depth, label, children }: { depth: number; label: string; children: React.ReactNode }) {
  const style: CSSProperties = {
    fontSize: "var(--font-size-xs)",
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "4px 0 2px",
    paddingLeft: depth * 16 + 26,
    userSelect: "none"
  }
  return (
    <div>
      <div style={style}>{label}</div>
      {children}
    </div>
  )
}

function KVRow({ depth, name, value }: { depth: number; name: string; value: string }) {
  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    height: 22,
    paddingLeft: depth * 16 + 26,
    paddingRight: "var(--space-3)",
    fontSize: "var(--font-size-xs)"
  }

  return (
    <div style={style}>
      <span style={{ color: "var(--text-secondary)" }}>{name}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  )
}

function EventRow({ event, depth }: { event: SpanEventRecord; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  const hasAttrs = event.attributes.length > 0

  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    height: "var(--row-height)",
    paddingLeft: depth * 16 + 8,
    paddingRight: "var(--space-3)",
    fontSize: "var(--font-size-sm)",
    cursor: hasAttrs ? "pointer" : "default",
    userSelect: "none"
  }

  return (
    <div>
      <div style={style} onClick={() => { if (hasAttrs) setExpanded(!expanded) }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--accent-yellow)">
          <circle cx="5" cy="5" r="3" />
        </svg>
        <span style={{ color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.name}
        </span>
        <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)", flexShrink: 0 }}>
          {event.offsetLabel}
        </span>
      </div>
      {expanded && event.attributes.map((attr) => (
        <KVRow key={attr.id} depth={depth + 1} name={attr.name} value={attr.value} />
      ))}
    </div>
  )
}

export function TracerTreeView() {
  const { tracer: { spans } } = useBackendSnapshot()

  const handleReset = useCallback(() => {
    window.electronAPI.dispatch({ type: "tracer:reset" })
  }, [])

  return (
    <div style={containerStyle}>
      <PanelHeader title="Tracer" count={spans.length}>
        <IconButton title="Reset tracer" onClick={handleReset}>
          <ResetIcon />
        </IconButton>
      </PanelHeader>
      <div style={scrollArea}>
        {spans.length === 0 ? (
          <EmptyState
            title="No spans"
            description="Spans will appear here when an Effect app reports trace data"
          />
        ) : (
          spans.map((span) => <SpanNode key={span.id} span={span} depth={0} />)
        )}
      </div>
    </div>
  )
}
