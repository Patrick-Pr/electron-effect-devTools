import { useCallback, useState } from "react"
import clsx from "clsx"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { IconButton } from "../../components/common/IconButton"
import { Badge } from "../../components/common/Badge"
import { EmptyState } from "../../components/common/EmptyState"
import type { MetricRecord } from "../../lib/contracts/metrics"

const ClearMetricsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

function MetricCard({ metric }: { metric: MetricRecord }) {
  const [expanded, setExpanded] = useState(metric.defaultExpanded ?? false)

  const hasTags = metric.tags.length > 0
  const hasDetails = metric.details.length > 0
  const hasContent = hasTags || hasDetails
  const regionId = `metric-details-${metric.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`

  return (
    <div className="border-b border-border-muted">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-3 px-4 border-0 bg-transparent text-left cursor-pointer select-none transition-[background] duration-(--transition-fast-duration) ease-(--transition-ease) hover:bg-subtle-hover"
        onClick={() => { if (hasContent) setExpanded(!expanded) }}
        aria-expanded={hasContent ? expanded : undefined}
        aria-controls={hasContent ? regionId : undefined}
      >
        <span
          className={clsx(
            "size-3.5 text-tertiary shrink-0",
            "transition-transform duration-(--transition-fast-duration) ease-(--transition-ease)",
            expanded && "rotate-90"
          )}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex-1 text-md text-primary truncate font-mono">{metric.name}</span>
        <Badge variant={metric.kind}>{metric.kind}</Badge>
        <span className="text-xs text-secondary font-mono shrink-0">{metric.description}</span>
      </button>
      {expanded && hasContent && (
        <div id={regionId} className="flex flex-col gap-1 px-4 pb-3" style={{ paddingLeft: 38 }}>
          {hasTags && (
            <div className="mb-1">
              <div className="text-xs text-tertiary mb-1 uppercase tracking-[0.05em]">Tags</div>
              {metric.tags.map((tag) => (
                <div key={tag.key} className="flex justify-between items-center text-xs py-0.5 gap-2">
                  <span className="text-secondary">{tag.key}</span>
                  <span className="text-primary font-mono text-right">{tag.value}</span>
                </div>
              ))}
            </div>
          )}
          {hasDetails && (
            <div>
              <div className="text-xs text-tertiary mb-1 uppercase tracking-[0.05em]">Details</div>
              {metric.details.map((detail) => (
                <div key={detail.key} className="flex justify-between items-center text-xs py-0.5 gap-2">
                  <span className="text-secondary">{detail.key}</span>
                  <span className="text-primary font-mono text-right">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function MetricsView() {
  const { metrics: { metrics } } = useBackendSnapshot()

  const handleReset = useCallback(() => {
    window.electronAPI.dispatch({ type: "metrics:reset" })
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader title="Metrics" count={metrics.length}>
        <IconButton title="Reset metrics" onClick={handleReset}>
          <ClearMetricsIcon />
        </IconButton>
      </PanelHeader>
      <div className="flex-1 overflow-auto py-2">
        {metrics.length === 0 ? (
          <EmptyState
            title="No metrics"
            description="Metrics will appear here when an Effect app reports Counter, Gauge, Histogram, Summary, or Frequency data"
          />
        ) : (
          metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)
        )}
      </div>
    </div>
  )
}
