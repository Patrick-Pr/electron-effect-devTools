import type { TraceEventRecord } from "../../lib/contracts/tracer"

export const MIN_VIEW_DURATION_MS = 1
export const MAX_VIEW_DURATION_MS = 60 * 60 * 1000
export const MIN_TICK_SPACING_PX = 60

export interface ViewState {
  startMs: number
  endMs: number
  offsetY: number
}

export interface TimeBounds {
  startMs: number
  endMs: number
}

/** A span projected into the current, expandable timeline. */
export interface TimelineRow {
  event: TraceEventRecord
  /** Unique visible row used for drawing and hit testing. */
  row: number
  /** Tree ancestry retained for labels/details, never used as a row. */
  ancestryDepth: number
  parentId?: string
  hasChildren: boolean
  expanded: boolean
}

export interface TraceViewerOptions {
  barHeight: number
  barPadding: number
  timelineHeight: number
  minimapHeight: number
}

export const defaultOptions: TraceViewerOptions = {
  barHeight: 20,
  barPadding: 3,
  timelineHeight: 20,
  minimapHeight: 72
}
