import { useCallback, useState } from "react"
import clsx from "clsx"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { IconButton } from "../../components/common/IconButton"
import { Badge } from "../../components/common/Badge"
import { EmptyState } from "../../components/common/EmptyState"
import type { TraceSpanRecord, SpanEventRecord } from "../../lib/contracts/tracer"

const ClearTracesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const LocationIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--color-link)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 2l8 0M6 2L2 6" />
  </svg>
)

function SpanNode({ span, depth }: { span: TraceSpanRecord; depth: number }) {
  const [expanded, setExpanded] = useState(false)

  const hasContent = (span.children && span.children.length > 0) ||
    span.attributes.length > 0 ||
    span.events.length > 0
  const regionId = `span-content-${span.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`

  const handleReveal = useCallback(() => {
    if (span.location) {
      window.electronAPI.revealLocation(span.location)
    }
  }, [span.location])

  return (
    <div>
      <div
        className={clsx(
          "flex items-center h-(--row-height) pr-3 select-none",
          "transition-[background] duration-(--transition-fast-duration) ease-(--transition-ease)",
          "hover:bg-subtle-hover",
          hasContent ? "cursor-pointer" : "cursor-default"
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        <button
          type="button"
          disabled={!hasContent}
          className="flex flex-1 min-w-0 items-center gap-2 h-full border-0 bg-transparent p-0 text-left disabled:cursor-default"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={hasContent ? expanded : undefined}
          aria-controls={hasContent ? regionId : undefined}
        >
          <span
            className={clsx(
              "size-3.5 text-tertiary shrink-0 transition-transform duration-(--transition-fast-duration) ease-(--transition-ease)",
              expanded && "rotate-90",
              !hasContent && "invisible"
            )}
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 truncate text-sm text-primary">{span.name}</span>
          {span.durationLabel && <Badge color="var(--color-secondary)">{span.durationLabel}</Badge>}
        </button>
        {span.location && (
          <button
            type="button"
            onClick={handleReveal}
            className="cursor-pointer flex border-0 bg-transparent p-1"
            title={`${span.location.path}:${span.location.line}`}
            aria-label={`Reveal ${span.name} at ${span.location.path}:${span.location.line}`}
          >
            <LocationIcon />
          </button>
        )}
      </div>
      {expanded && (
        <div id={regionId}>
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
        </div>
      )}
    </div>
  )
}

function AttrSection({ depth, label, children }: { depth: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-xs text-tertiary uppercase tracking-[0.05em] select-none"
        style={{ padding: "4px 0 2px", paddingLeft: depth * 16 + 26 }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function KVRow({ depth, name, value }: { depth: number; name: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 h-5.5 pr-3 text-xs"
      style={{ paddingLeft: depth * 16 + 26 }}
    >
      <span className="text-secondary">{name}</span>
      <span className="text-primary font-mono">{value}</span>
    </div>
  )
}

function EventRow({ event, depth }: { event: SpanEventRecord; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  const hasAttrs = event.attributes.length > 0
  const regionId = `event-content-${event.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`

  return (
    <div>
      <button
        type="button"
        disabled={!hasAttrs}
        className={clsx(
          "flex items-center gap-2 h-(--row-height) pr-3 w-full border-0 bg-transparent text-left text-sm select-none",
          hasAttrs ? "cursor-pointer" : "cursor-default"
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={hasAttrs ? expanded : undefined}
        aria-controls={hasAttrs ? regionId : undefined}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--color-accent-yellow)">
          <circle cx="5" cy="5" r="3" />
        </svg>
        <span className="text-primary flex-1 truncate">{event.name}</span>
        <span className="text-tertiary font-mono text-xs shrink-0">{event.offsetLabel}</span>
      </button>
      {expanded && (
        <div id={regionId}>{event.attributes.map((attr) => (
          <KVRow key={attr.id} depth={depth + 1} name={attr.name} value={attr.value} />
        ))}</div>
      )}
    </div>
  )
}

export function TracerTreeView() {
  const { tracer: { spans } } = useBackendSnapshot()

  const handleReset = useCallback(() => {
    window.electronAPI.dispatch({ type: "tracer:reset" })
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader title="Tracer" count={spans.length}>
        <IconButton title="Reset tracer" onClick={handleReset}>
          <ClearTracesIcon />
        </IconButton>
      </PanelHeader>
      <div className="flex-1 overflow-auto">
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
