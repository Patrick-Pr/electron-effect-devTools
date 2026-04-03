import { type CSSProperties, useCallback, useState } from "react"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { IconButton } from "../../components/common/IconButton"
import { Badge } from "../../components/common/Badge"
import { EmptyState } from "../../components/common/EmptyState"
import type { MetricRecord } from "../../lib/contracts/metrics"

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden"
}

const scrollArea: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "var(--space-2) 0"
}

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8a6 6 0 1111.5-2.5" />
    <path d="M2 3v5h5" />
  </svg>
)

function MetricCard({ metric }: { metric: MetricRecord }) {
  const [expanded, setExpanded] = useState(metric.defaultExpanded ?? false)

  const cardStyle: CSSProperties = {
    borderBottom: "1px solid var(--border-muted)"
  }

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-3) var(--space-4)",
    cursor: "pointer",
    transition: "background var(--transition-fast)",
    userSelect: "none"
  }

  const chevronStyle: CSSProperties = {
    width: 14,
    height: 14,
    color: "var(--text-tertiary)",
    transition: "transform var(--transition-fast)",
    transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
    flexShrink: 0
  }

  const nameStyle: CSSProperties = {
    flex: 1,
    fontSize: "var(--font-size-md)",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-mono)"
  }

  const descStyle: CSSProperties = {
    fontSize: "var(--font-size-xs)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    flexShrink: 0
  }

  const detailsStyle: CSSProperties = {
    padding: "0 var(--space-4) var(--space-3)",
    paddingLeft: 38,
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)"
  }

  const kvRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "var(--font-size-xs)",
    padding: "2px 0",
    gap: "var(--space-2)"
  }

  const kvKeyStyle: CSSProperties = {
    color: "var(--text-secondary)"
  }

  const kvValueStyle: CSSProperties = {
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    textAlign: "right"
  }

  const hasTags = metric.tags.length > 0
  const hasDetails = metric.details.length > 0

  return (
    <div style={cardStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <span style={chevronStyle}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span style={nameStyle}>{metric.name}</span>
        <Badge variant={metric.kind}>{metric.kind}</Badge>
        <span style={descStyle}>{metric.description}</span>
      </div>
      {expanded && (hasTags || hasDetails) && (
        <div style={detailsStyle}>
          {hasTags && (
            <div style={{ marginBottom: "var(--space-1)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tags
              </div>
              {metric.tags.map((tag) => (
                <div key={tag.key} style={kvRowStyle}>
                  <span style={kvKeyStyle}>{tag.key}</span>
                  <span style={kvValueStyle}>{tag.value}</span>
                </div>
              ))}
            </div>
          )}
          {hasDetails && (
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Details
              </div>
              {metric.details.map((detail) => (
                <div key={detail.key} style={kvRowStyle}>
                  <span style={kvKeyStyle}>{detail.key}</span>
                  <span style={kvValueStyle}>{detail.value}</span>
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
    <div style={containerStyle}>
      <PanelHeader title="Metrics" count={metrics.length}>
        <IconButton title="Reset metrics" onClick={handleReset}>
          <ResetIcon />
        </IconButton>
      </PanelHeader>
      <div style={scrollArea}>
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
