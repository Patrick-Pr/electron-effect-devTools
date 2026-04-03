export interface ViewState {
  startMs: number
  endMs: number
  offsetY: number
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
