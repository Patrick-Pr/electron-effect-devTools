import type { ClientRecord, RunningState } from "./clients.js"
import type { DebugStateSnapshot, LocationRecord } from "./debug.js"
import type { MetricRecord } from "./metrics.js"
import type { TraceEventRecord, TraceSpanRecord } from "./tracer.js"

export interface ClientsStateSnapshot {
  runningState: RunningState
  clients: ClientRecord[]
}

export interface MetricsStateSnapshot {
  metrics: MetricRecord[]
}

export interface TracerStateSnapshot {
  spans: TraceSpanRecord[]
  events: TraceEventRecord[]
}

export interface BackendSnapshot {
  appName: string
  version: string
  clients: ClientsStateSnapshot
  metrics: MetricsStateSnapshot
  tracer: TracerStateSnapshot
  debug: DebugStateSnapshot
}

export type BackendCommand =
  | { type: "server:start" }
  | { type: "server:stop" }
  | { type: "client:select"; clientId: number }
  | { type: "client:disconnect"; clientId: number }
  | { type: "client:remove"; clientId: number }
  | { type: "metrics:reset" }
  | { type: "tracer:reset" }
  | { type: "timeline:reset" }
  | { type: "reveal-location"; location: LocationRecord }
  | { type: "debug:variables:load"; variableId: string }
  | { type: "debug:fiber:interrupt"; fiberId: string }
  | { type: "debug:breakpoints:toggle-pause-on-defects" }
  | { type: "debug:span-stack:set-ignore-list-enabled"; enabled: boolean }
  | { type: "debug:snapshot:refresh" }

export type BackendSubscriptionEvent = {
  type: "backend:state"
  snapshot: BackendSnapshot
}
