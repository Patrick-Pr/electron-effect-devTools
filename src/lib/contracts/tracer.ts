import type { LocationRecord, VariableRecord } from "./debug"

export interface TraceEventRecord {
  id: string
  name: string
  startTime: number
  endTime: number
  depth: number
  color: string
}

export interface SpanEventRecord {
  id: string
  name: string
  offsetLabel: string
  attributes: VariableRecord[]
}

export interface TraceSpanRecord {
  id: string
  traceId: string
  spanId: string
  name: string
  durationLabel?: string
  location?: LocationRecord
  attributes: VariableRecord[]
  events: SpanEventRecord[]
  children?: TraceSpanRecord[]
}
