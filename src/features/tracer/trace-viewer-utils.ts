import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { defaultOptions } from "./trace-viewer-types"

export function getVisibleTraces(
  traces: TraceEventRecord[],
  viewState: ViewState,
  canvasHeight: number,
  opts: TraceViewerOptions = defaultOptions
): TraceEventRecord[] {
  return traces.filter((t) => {
    const visibleH = t.endTime >= viewState.startMs && t.startTime <= viewState.endMs
    const y = opts.timelineHeight + t.depth * (opts.barHeight + opts.barPadding) + viewState.offsetY
    const visibleV = y + opts.barHeight >= 0 && y <= canvasHeight
    return visibleH && visibleV
  })
}

export function traceY(depth: number, offsetY: number, opts: TraceViewerOptions = defaultOptions): number {
  return opts.timelineHeight + depth * (opts.barHeight + opts.barPadding) + offsetY
}

export function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(Math.round((ms / 1000) * 10) / 10).toLocaleString()}s`
  }
  return `${Math.round(ms)}ms`
}

export function fullTimeRange(traces: TraceEventRecord[]): { start: number; end: number } | null {
  if (traces.length === 0) return null
  let start = traces[0].startTime
  let end = traces[0].endTime
  for (const t of traces) {
    if (t.startTime < start) start = t.startTime
    if (t.endTime > end) end = t.endTime
  }
  return { start, end }
}

export function maxDepth(traces: TraceEventRecord[]): number {
  let max = 0
  for (const t of traces) {
    if (t.depth > max) max = t.depth
  }
  return max
}
