import type { TraceEventRecord, TraceSpanRecord } from "../../lib/contracts/tracer"
import type { TimeBounds, TimelineRow, TraceViewerOptions, ViewState } from "./trace-viewer-types"
import {
  defaultOptions,
  MAX_VIEW_DURATION_MS,
  MIN_TICK_SPACING_PX,
  MIN_VIEW_DURATION_MS
} from "./trace-viewer-types"

const DEFAULT_BOUNDS: TimeBounds = { startMs: 0, endMs: 2_000 }

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

export function getCanvasBackingSize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
  const width = Math.max(0, finite(cssWidth, 0))
  const height = Math.max(0, finite(cssHeight, 0))
  const dpr = Math.max(1, finite(devicePixelRatio, 1))
  return {
    cssWidth: width,
    cssHeight: height,
    backingWidth: Math.max(1, Math.round(width * dpr)),
    backingHeight: Math.max(1, Math.round(height * dpr)),
    dpr
  }
}

export function getTraceTimeBounds(traces: TraceEventRecord[]): TimeBounds {
  let startMs = Number.POSITIVE_INFINITY
  let endMs = Number.NEGATIVE_INFINITY

  for (const trace of traces) {
    if (Number.isFinite(trace.startTime)) startMs = Math.min(startMs, trace.startTime)
    if (Number.isFinite(trace.endTime)) endMs = Math.max(endMs, trace.endTime)
  }

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return { ...DEFAULT_BOUNDS }
  if (endMs <= startMs) endMs = startMs + MIN_VIEW_DURATION_MS
  return { startMs, endMs }
}

export function fitViewToBounds(bounds: TimeBounds, offsetY = 0): ViewState {
  const safeStart = finite(bounds.startMs, DEFAULT_BOUNDS.startMs)
  const safeEnd = Math.max(safeStart + MIN_VIEW_DURATION_MS, finite(bounds.endMs, DEFAULT_BOUNDS.endMs))
  const dataDuration = safeEnd - safeStart
  const padding = Math.max(dataDuration * 0.1, 50)
  const desiredDuration = Math.min(MAX_VIEW_DURATION_MS, Math.max(MIN_VIEW_DURATION_MS, dataDuration + padding * 2))
  const center = safeStart + dataDuration / 2

  return {
    startMs: center - desiredDuration / 2,
    endMs: center + desiredDuration / 2,
    offsetY: finite(offsetY, 0)
  }
}

/** Normalize a viewport and keep at least a sliver of the data in view. */
export function clampViewToBounds(view: ViewState, bounds: TimeBounds): ViewState {
  const safeBounds = getSafeBounds(bounds)
  const fallback = fitViewToBounds(safeBounds, view.offsetY)
  const requestedStart = finite(view.startMs, fallback.startMs)
  const requestedEnd = finite(view.endMs, fallback.endMs)
  const rawDuration = requestedEnd > requestedStart ? requestedEnd - requestedStart : MIN_VIEW_DURATION_MS
  const duration = Math.min(MAX_VIEW_DURATION_MS, Math.max(MIN_VIEW_DURATION_MS, rawDuration))
  let startMs: number
  const requestedNormalizedEnd = requestedStart + duration
  if (requestedNormalizedEnd <= safeBounds.startMs) {
    startMs = safeBounds.startMs
  } else if (requestedStart >= safeBounds.endMs) {
    startMs = safeBounds.endMs - duration
  } else {
    startMs = requestedStart
  }

  return { startMs, endMs: startMs + duration, offsetY: finite(view.offsetY, 0) }
}

function getSafeBounds(bounds: TimeBounds): TimeBounds {
  const startMs = finite(bounds.startMs, DEFAULT_BOUNDS.startMs)
  const endMs = Math.max(startMs + MIN_VIEW_DURATION_MS, finite(bounds.endMs, DEFAULT_BOUNDS.endMs))
  return { startMs, endMs }
}

/** Selects a 1/2/5×10ⁿ interval, including scales beyond one minute. */
export function selectTickInterval(
  durationMs: number,
  cssWidth: number,
  minSpacingPx = MIN_TICK_SPACING_PX
): number {
  const safeDuration = Math.max(MIN_VIEW_DURATION_MS, finite(durationMs, MIN_VIEW_DURATION_MS))
  const safeWidth = Math.max(1, finite(cssWidth, 1))
  const targetTickCount = Math.max(1, Math.floor(safeWidth / Math.max(1, minSpacingPx)))
  const minimumInterval = safeDuration / targetTickCount
  const power = 10 ** Math.floor(Math.log10(Math.max(minimumInterval, Number.MIN_VALUE)))

  for (const multiplier of [1, 2, 5, 10]) {
    const interval = multiplier * power
    if (interval >= minimumInterval) return interval
  }
  return 10 * power
}

export function getTimelineTicks(
  view: Pick<ViewState, "startMs" | "endMs">,
  cssWidth: number,
  minSpacingPx = MIN_TICK_SPACING_PX
): number[] {
  const duration = view.endMs - view.startMs
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(cssWidth) || cssWidth <= 0) return []

  const interval = selectTickInterval(duration, cssWidth, minSpacingPx)
  const firstIndex = Math.ceil(view.startMs / interval)
  const lastIndex = Math.floor(view.endMs / interval)
  const hardLimit = Math.max(2, Math.ceil(cssWidth / Math.max(1, minSpacingPx)) + 2)
  const count = Math.max(0, Math.min(hardLimit, lastIndex - firstIndex + 1))
  return Array.from({ length: count }, (_, index) => (firstIndex + index) * interval)
}

export function layoutTimelineRows(
  spans: TraceSpanRecord[],
  events: TraceEventRecord[],
  expandedIds: ReadonlySet<string>
): TimelineRow[] {
  const eventById = new Map(events.map((event) => [event.id, event]))
  const usedIds = new Set<string>()
  const treeIds = new Set<string>()
  const result: TimelineRow[] = []

  const collectTreeIds = (span: TraceSpanRecord) => {
    treeIds.add(span.id)
    for (const child of span.children ?? []) collectTreeIds(child)
  }
  for (const span of spans) collectTreeIds(span)

  const compareSpans = (left: TraceSpanRecord, right: TraceSpanRecord) => {
    const leftEvent = eventById.get(left.id)
    const rightEvent = eventById.get(right.id)
    return (leftEvent?.startTime ?? Number.POSITIVE_INFINITY) - (rightEvent?.startTime ?? Number.POSITIVE_INFINITY) ||
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
  }

  const visit = (span: TraceSpanRecord, ancestryDepth: number, parentId?: string) => {
    const event = eventById.get(span.id)
    const children = [...(span.children ?? [])].sort(compareSpans)
    const expanded = expandedIds.has(span.id)
    if (event && !usedIds.has(event.id)) {
      usedIds.add(event.id)
      result.push({ event, row: result.length, ancestryDepth, parentId, hasChildren: children.length > 0, expanded })
    }

    // Structural nodes without timing data cannot own a canvas disclosure.
    if (!event || expanded) {
      for (const child of children) visit(child, ancestryDepth + 1, span.id)
    }
  }

  for (const span of [...spans].sort(compareSpans)) visit(span, 0)

  const unmatched = events
    .filter((event) => !usedIds.has(event.id) && !treeIds.has(event.id))
    .sort((left, right) => left.startTime - right.startTime || left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
  for (const event of unmatched) {
    result.push({ event, row: result.length, ancestryDepth: event.depth, hasChildren: false, expanded: false })
  }
  return result
}

export function getDefaultExpandedIds(spans: TraceSpanRecord[]): Set<string> {
  return new Set(spans.filter((span) => (span.children?.length ?? 0) > 0).map((span) => span.id))
}

export function findSpanById(spans: TraceSpanRecord[], id: string): TraceSpanRecord | undefined {
  for (const span of spans) {
    if (span.id === id) return span
    const child = findSpanById(span.children ?? [], id)
    if (child) return child
  }
  return undefined
}

export function traceY(row: number, offsetY: number, opts: TraceViewerOptions = defaultOptions): number {
  return opts.timelineHeight + row * (opts.barHeight + opts.barPadding) + offsetY
}

export function clampVerticalOffset(
  offsetY: number,
  rowCount: number,
  cssHeight: number,
  opts: TraceViewerOptions = defaultOptions
): number {
  const contentBottom = opts.timelineHeight + rowCount * (opts.barHeight + opts.barPadding) - opts.barPadding
  const maxOffset = Math.max(0, contentBottom - Math.max(0, cssHeight))
  if (maxOffset === 0) return 0
  return Math.max(-maxOffset, Math.min(0, finite(offsetY, 0)))
}

export function findTimelineRowAt(
  rows: TimelineRow[],
  viewState: ViewState,
  cssWidth: number,
  x: number,
  y: number,
  opts: TraceViewerOptions = defaultOptions
): TimelineRow | undefined {
  const duration = viewState.endMs - viewState.startMs
  if (duration <= 0 || cssWidth <= 0 || y < opts.timelineHeight) return undefined
  const pxPerMs = cssWidth / duration

  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index]
    const eventX = (row.event.startTime - viewState.startMs) * pxPerMs
    const eventWidth = Math.max(1, (row.event.endTime - row.event.startTime) * pxPerMs)
    const eventY = traceY(row.row, viewState.offsetY, opts)
    if (x >= eventX && x <= eventX + eventWidth && y >= eventY && y <= eventY + opts.barHeight) return row
  }
  return undefined
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(Math.round((ms / 1000) * 10) / 10).toLocaleString()}s`
  return `${Math.round(ms)}ms`
}
